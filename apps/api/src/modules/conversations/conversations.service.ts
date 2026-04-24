import { ForbiddenException, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  BotConnection,
  Conversation,
  ConversationMessage,
  Lead,
} from "../../database/entities";
import { Repository } from "typeorm";
import axios from "axios";
import { EncryptionService } from "../../common/encryption.service";
import { S3StorageService } from "../../common/s3-storage.service";
import { logError, logInfo } from "../../common/logging";
import { RabbitMqService } from "../../common/rabbitmq.service";

type ConversationReplyJob = {
  companyId: string;
  conversationId: string;
  text: string;
  attachments: Array<{ name?: string; data?: string }>;
  requestedByRole?: string;
  requestedByCompanyId?: string | null;
};

type ConversationMode = "assistant" | "manager";

@Injectable()
export class ConversationsService {
  private readonly log = new Logger(ConversationsService.name);
  constructor(
    @InjectRepository(Conversation) private convRepo: Repository<Conversation>,
    @InjectRepository(Lead) private leadsRepo: Repository<Lead>,
    @InjectRepository(ConversationMessage)
    private msgRepo: Repository<ConversationMessage>,
    @InjectRepository(BotConnection)
    private botsRepo: Repository<BotConnection>,
    private encryption: EncryptionService,
    private storage: S3StorageService,
    private rabbit: RabbitMqService,
  ) {}

  private assertCompanyAccess(
    user: { role?: string; companyId?: string | null },
    companyId: string,
  ) {
    if (user.role === "admin") return;
    if (!user.companyId || user.companyId !== companyId) {
      throw new ForbiddenException("Нет доступа");
    }
  }

  async list(
    user: { role?: string; companyId?: string | null },
    companyId: string,
  ) {
    this.assertCompanyAccess(user, companyId);
    const allConversations = await this.convRepo.find({
      where: { companyId },
      order: { createdAt: "DESC" },
    });
    const byTelegramUser = new Map<string, Conversation>();
    for (const c of allConversations) {
      if (!byTelegramUser.has(c.telegramUserId)) {
        byTelegramUser.set(c.telegramUserId, c);
      }
    }
    const conversations = Array.from(byTelegramUser.values());
    const leads = await this.leadsRepo.find({ where: { companyId } });
    const ids = conversations.map((x) => x.id);
    const messages = ids.length
      ? await this.msgRepo.find({
          where: ids.map((id) => ({ conversationId: id })),
          order: { createdAt: "DESC" },
        })
      : [];

    return conversations.map((conversation) => {
      const lead = leads.find(
        (item) => item.conversationId === conversation.id,
      );
      const context = (conversation.context || {}) as Record<string, unknown>;
      const convoMessages = messages.filter(
        (m) => m.conversationId === conversation.id,
      );
      const latest = convoMessages[0];
      const mode = this.resolveMode(conversation);

      return {
        id: conversation.id,
        botConnectionId: conversation.botConnectionId,
        telegramUserId: conversation.telegramUserId,
        createdAt: conversation.createdAt,
        state: conversation.state,
        mode,
        managerHoldUntil:
          typeof context.managerHoldUntil === "string"
            ? context.managerHoldUntil
            : null,
        managerTakeoverAt:
          typeof context.managerTakeoverAt === "string"
            ? context.managerTakeoverAt
            : null,
        messagesCount: convoMessages.length,
        lead,
        preview: String(
          latest?.text || lead?.need || context.name || "Новый диалог",
        ),
        lastMessage: latest
          ? {
              role: latest.role,
              text: latest.text,
              attachments: latest.attachments || [],
              createdAt: latest.createdAt,
            }
          : null,
      };
    });
  }

  async messages(
    user: { role?: string; companyId?: string | null },
    companyId: string,
    conversationId: string,
    opts?: { cursor?: string; limit?: number },
  ) {
    this.assertCompanyAccess(user, companyId);
    const conversation = await this.convRepo.findOne({
      where: { id: conversationId, companyId },
    });
    if (!conversation) return { items: [], hasMore: false, nextCursor: null };
    const limit = Math.max(10, Math.min(100, Number(opts?.limit || 40)));
    const cursorDate = opts?.cursor ? new Date(opts.cursor) : null;
    const cursorValid = cursorDate && !Number.isNaN(cursorDate.getTime());
    const qb = this.msgRepo
      .createQueryBuilder("m")
      .where("m.companyId = :companyId", { companyId })
      .andWhere("m.conversationId = :conversationId", { conversationId })
      .orderBy("m.createdAt", "DESC")
      .addOrderBy("m.id", "DESC")
      .limit(limit + 1);
    if (cursorValid) {
      qb.andWhere("m.createdAt < :cursor", {
        cursor: cursorDate?.toISOString(),
      });
    }
    const rows = await qb.getMany();
    const hasMore = rows.length > limit;
    const slice = rows.slice(0, limit);
    const ordered = slice.reverse();
    const nextCursor = hasMore ? slice[slice.length - 1]?.createdAt || null : null;
    return {
      items: ordered.map((m) => ({
        id: m.id,
        role: m.role,
        text: m.text,
        attachments: m.attachments || [],
        createdAt: m.createdAt,
      })),
      hasMore,
      nextCursor: nextCursor ? nextCursor.toISOString() : null,
    };
  }

  async setMode(
    user: { role?: string; companyId?: string | null },
    companyId: string,
    conversationId: string,
    body: {
      mode: ConversationMode;
      managerHoldMinutes?: number;
    },
  ) {
    this.assertCompanyAccess(user, companyId);
    const conversation = await this.convRepo.findOne({
      where: { id: conversationId, companyId },
    });
    if (!conversation) return { ok: false };
    const mode: ConversationMode =
      body?.mode === "manager" ? "manager" : "assistant";
    const holdMinutes = Math.max(
      5,
      Math.min(180, Number(body?.managerHoldMinutes || 25)),
    );
    const context = { ...(conversation.context || {}) } as Record<string, unknown>;
    if (mode === "manager") {
      context.managerTakeoverAt = new Date().toISOString();
      context.managerHoldUntil = new Date(
        Date.now() + holdMinutes * 60 * 1000,
      ).toISOString();
      context.managerEscalatedAt = context.managerEscalatedAt || new Date().toISOString();
    } else {
      delete context.managerTakeoverAt;
      delete context.managerHoldUntil;
      delete context.managerEscalatedAt;
    }
    conversation.context = context;
    await this.convRepo.save(conversation);
    return {
      ok: true,
      mode: this.resolveMode(conversation),
      managerHoldUntil:
        typeof context.managerHoldUntil === "string"
          ? context.managerHoldUntil
          : null,
    };
  }

  private resolveMode(conversation: Conversation): ConversationMode {
    const context = (conversation.context || {}) as Record<string, unknown>;
    const holdUntilRaw = String(context.managerHoldUntil || "").trim();
    if (!holdUntilRaw) return "assistant";
    const holdUntil = new Date(holdUntilRaw);
    if (Number.isNaN(holdUntil.getTime())) return "assistant";
    return holdUntil.getTime() > Date.now() ? "manager" : "assistant";
  }

  async reply(
    user: { role?: string; companyId?: string | null },
    companyId: string,
    conversationId: string,
    text: string,
    attachments: Array<{ name?: string; data?: string }> = [],
  ) {
    this.assertCompanyAccess(user, companyId);
    const messageText = text.trim();
    if (!messageText && !attachments.length) return { ok: false };
    const payload: ConversationReplyJob = {
      companyId,
      conversationId,
      text: messageText,
      attachments,
      requestedByRole: user.role,
      requestedByCompanyId: user.companyId ?? null,
    };

    const queueName = this.rabbit.getConversationReplyQueue();
    if (!this.rabbit.isEnabled()) {
      await this.processReplyJob(payload);
      return { ok: true, queued: false };
    }

    const queued = await this.rabbit.publish(queueName, payload);
    if (!queued) {
      logError(this.log, "chat_reply_queue_publish_failed_fallback_sync", {
        companyId,
        conversationId,
      });
      await this.processReplyJob(payload);
      return { ok: true, queued: false };
    }

    logInfo(this.log, "chat_reply_queued", {
      companyId,
      conversationId,
      hasText: Boolean(messageText),
      attachmentsCount: attachments.length,
      queue: queueName,
    });
    return { ok: true, queued: true };
  }

  async processReplyJob(job: ConversationReplyJob) {
    const { companyId, conversationId } = job;
    this.assertCompanyAccess(
      {
        role: job.requestedByRole,
        companyId: job.requestedByCompanyId,
      },
      companyId,
    );
    const conversation = await this.convRepo.findOne({
      where: { id: conversationId, companyId },
    });
    if (!conversation) return { ok: false };
    const bot = await this.botsRepo.findOne({
      where: { id: conversation.botConnectionId, status: "active" },
    });
    if (!bot) return { ok: false };
    const chatIdRaw = (conversation.context as Record<string, unknown>)?.chatId;
    const chatId = Number(chatIdRaw);
    if (!Number.isFinite(chatId)) return { ok: false };
    const token = this.encryption.decrypt(bot.tokenEncrypted);
    const messageText = String(job.text || "").trim();
    const attachments = Array.isArray(job.attachments) ? job.attachments : [];

    logInfo(this.log, "chat_reply_processing", {
      companyId,
      conversationId,
      chatId,
      hasText: Boolean(messageText),
      attachmentsCount: attachments.length,
    });

    if (messageText) {
      try {
        await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
          chat_id: chatId,
          text: messageText,
        });
      } catch (e) {
        logError(this.log, "chat_reply_send_failed", {
          companyId,
          conversationId,
          chatId,
          message: e instanceof Error ? e.message : "telegram_send_error",
        });
        throw e;
      }
    }
    const storedAttachments: Array<{ name?: string; data?: string }> = [];
    for (const attachment of attachments) {
      const name = String(attachment?.name || "file");
      const raw = String(attachment?.data || "");
      if (!raw) continue;
      const uploaded = await this.storage.uploadDataUrl(raw, {
        prefix: `companies/${companyId}/chats`,
        fileName: name,
      });
      const fileUrl = uploaded?.url || raw;
      await axios.post(`https://api.telegram.org/bot${token}/sendDocument`, {
        chat_id: chatId,
        document: fileUrl,
      });
      storedAttachments.push({
        name,
        data: fileUrl,
      });
    }
    await this.msgRepo.save(
      this.msgRepo.create({
        conversationId,
        companyId,
        role: "manager",
        text: messageText || "Отправлены файлы",
        attachments: storedAttachments,
      }),
    );
    logInfo(this.log, "chat_reply_sent", {
      companyId,
      conversationId,
      hasText: Boolean(messageText),
      attachmentsCount: storedAttachments.length,
    });
    return { ok: true };
  }

  async remove(
    user: { role?: string; companyId?: string | null },
    companyId: string,
    conversationId: string,
  ) {
    this.assertCompanyAccess(user, companyId);
    const conversation = await this.convRepo.findOne({
      where: { id: conversationId, companyId },
    });
    if (!conversation) return { ok: false };
    await this.msgRepo.delete({ conversationId });
    await this.leadsRepo.delete({ conversationId });
    await this.convRepo.delete({ id: conversationId });
    logInfo(this.log, "conversation_removed", {
      companyId,
      conversationId,
    });
    return { ok: true };
  }
}
