import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import axios from "axios";
import { Repository } from "typeorm";
import { BotConnection, Conversation } from "../../database/entities";
import { EncryptionService } from "../../common/encryption.service";
import { BotsService } from "../bots/bots.service";
import { LeadsService } from "../leads/leads.service";
import { BillingService } from "../billing/billing.service";
import { TimewebAiService } from "../ai/timeweb-ai.service";

@Injectable()
export class TelegramService {
  private readonly log = new Logger(TelegramService.name);
  private buckets = new Map<string, number[]>();

  constructor(
    @InjectRepository(Conversation) private conv: Repository<Conversation>,
    private bots: BotsService,
    private leads: LeadsService,
    private billing: BillingService,
    private timewebAi: TimewebAiService,
    private encryption: EncryptionService,
  ) {}

  private allow(uid: string) {
    const now = Date.now();
    const arr = (this.buckets.get(uid) || []).filter((x) => now - x < 60000);
    if (arr.length >= 15) return false;
    arr.push(now);
    this.buckets.set(uid, arr);
    return true;
  }

  /** Вход по секрету из webhook (или глобальный секрет). */
  async handleWebhookSecret(secret: string, update: unknown) {
    const bot = await this.bots.findBySecret(
      secret || process.env.GLOBAL_BOT_SECRET || "",
    );
    if (!bot) return { ok: true as const };
    await this.dispatchUpdate(bot, update);
    return { ok: true as const };
  }

  /** Обработка одного Update для известного подключения (webhook и polling). */
  async dispatchUpdate(bot: BotConnection, update: unknown) {
    const msg = (update as { message?: Record<string, unknown> })?.message;
    if (!msg?.from || typeof msg.text !== "string") return;
    const from = msg.from as { id?: number };
    const chat = msg.chat as { id?: number } | undefined;
    const fromId = from.id;
    const chatId = chat?.id;
    if (fromId == null || chatId == null) return;
    if (!this.allow(String(fromId))) return;

    const text = msg.text;
    const aiReply = async (state: string, ctx: Record<string, unknown>) => {
      if (!this.timewebAi.isEnabled()) return null;
      return this.timewebAi.salesAssistantReply({
        state,
        context: ctx,
        userText: text,
        isStart: text.startsWith("/start"),
      });
    };

    let c = await this.conv.findOne({
      where: { companyId: bot.companyId, telegramUserId: String(fromId) },
    });
    if (!c) {
      c = await this.conv.save(
        this.conv.create({
          companyId: bot.companyId,
          botConnectionId: bot.id,
          telegramUserId: String(fromId),
          state: "ASK_NAME",
          context: {},
        }),
      );
    }
    const ctx = (c.context || {}) as Record<string, unknown>;

    const send = async (replyText: string) => {
      await this.sendChatMessage(bot, chatId, replyText);
    };

    if (text.startsWith("/start")) {
      c.state = "ASK_NAME";
      c.context = {};
      await this.conv.save(c);
      const ar = await aiReply("ASK_NAME", {});
      await send(ar ?? "Здравствуйте! Как вас зовут?");
      return;
    }
    if (c.state === "ASK_NAME") {
      c.context = { ...ctx, name: text };
      c.state = "ASK_PHONE";
      await this.conv.save(c);
      const ar = await aiReply("ASK_PHONE", c.context as Record<string, unknown>);
      await send(ar ?? "Введите телефон");
      return;
    }
    if (c.state === "ASK_PHONE") {
      c.context = { ...ctx, phone: text };
      c.state = "ASK_NEED";
      await this.conv.save(c);
      const ar = await aiReply("ASK_NEED", c.context as Record<string, unknown>);
      await send(ar ?? "Что вам нужно?");
      return;
    }
    if (c.state === "ASK_NEED") {
      const can = await this.billing.canCreateLead(bot.companyId);
      if (!can) {
        await send("Лимит лидов на тарифе исчерпан. Попробуйте позже.");
        return;
      }
      await this.leads.createLead({
        companyId: bot.companyId,
        conversationId: c.id,
        fullName: String((c.context as Record<string, unknown>).name || "Unknown"),
        phone: String((c.context as Record<string, unknown>).phone || ""),
        need: text,
      });
      await this.billing.incrementLead(bot.companyId);
      c.state = "DONE";
      await this.conv.save(c);
      const doneCtx = { ...c.context, need: text };
      const ar = await aiReply("DONE", doneCtx as Record<string, unknown>);
      await send(ar ?? "Спасибо! Ваша заявка принята.");
    }
  }

  private async sendChatMessage(bot: BotConnection, chatId: number, text: string) {
    try {
      const token = this.encryption.decrypt(bot.tokenEncrypted);
      await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
        chat_id: chatId,
        text,
      });
    } catch (e) {
      this.log.error(`sendMessage failed (бот ${bot.id})`, e);
    }
  }
}
