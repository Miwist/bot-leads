import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import axios from "axios";
import { ILike, Repository } from "typeorm";
import {
  BotConnection,
  Company,
  Conversation,
  ConversationMessage,
} from "../../database/entities";
import { EncryptionService } from "../../common/encryption.service";
import { BotsService } from "../bots/bots.service";
import { LeadsService } from "../leads/leads.service";
import { BillingService } from "../billing/billing.service";
import { TimewebAiService } from "../ai/timeweb-ai.service";
import { logError, logInfo } from "../../common/logging";

@Injectable()
export class TelegramService {
  private readonly log = new Logger(TelegramService.name);
  private buckets = new Map<string, number[]>();

  constructor(
    @InjectRepository(Conversation) private conv: Repository<Conversation>,
    @InjectRepository(ConversationMessage)
    private messages: Repository<ConversationMessage>,
    @InjectRepository(Company) private companies: Repository<Company>,
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

  private isSharedBot(bot: BotConnection) {
    return bot.companyId === "__shared__";
  }

  private parseStartPayload(text: string): string {
    const direct = text.match(/^\/start\??=?(.+)$/i);
    if (direct?.[1]) {
      return direct[1].trim().replace(/^[?=]+/, "");
    }
    const spaced = text.match(/^\/start(?:\s+(.+))?$/i);
    const raw = (spaced?.[1] || "").trim();
    return raw.replace(/^[?=]+/, "");
  }

  private async getCompanyByStartPayload(payload: string) {
    if (!payload) return null;
    const byId = await this.companies.findOne({
      where: { id: payload, isActive: true },
    });
    if (byId) return byId;
    return this.companies.findOne({
      where: { slug: payload, isActive: true },
    });
  }

  private async searchCompanies(query: string, page: number) {
    const take = 5;
    const skip = page * take;
    return this.companies.find({
      where: {
        isActive: true,
        name: ILike(`%${query}%`),
      },
      order: { name: "ASC" },
      take,
      skip,
    });
  }

  private sanitizeUserText(input: string): string {
    const txt = String(input || "").trim();
    return txt
      .replace(/(?:token|secret|парол\w*|ключ\w*|jwt|id компании)\s*[:=].*/gi, "[скрыто]")
      .slice(0, 2000);
  }

  private inferMaterialKind(item: {
    kind?: string;
    mime?: string;
    fileName?: string;
  }) {
    if (item.kind && item.kind !== "auto" && item.kind !== "group") return item.kind;
    const mime = String(item.mime || "").toLowerCase();
    const fileName = String(item.fileName || "").toLowerCase();
    if (mime.startsWith("image/")) return "photo";
    if (mime.startsWith("video/")) return "video";
    if (mime.startsWith("audio/ogg") || fileName.endsWith(".ogg")) return "voice";
    if (mime.startsWith("audio/")) return "document";
    return "document";
  }

  private resolveMaterialUrl(item: {
    url?: string;
    key?: string;
  }) {
    const rawUrl = String(item.url || "").trim();
    if (!rawUrl) return "";
    const base = String(process.env.S3_PUBLIC_BASE_URL || "").trim().replace(/\/+$/g, "");
    const bucket = String(process.env.S3_BUCKET || "").trim();
    const key = String(item.key || "").trim().replace(/^\/+/, "");
    if (!base || !bucket || !key) return rawUrl;
    const expectedPrefix = `${base}/${bucket}/`;
    if (rawUrl.startsWith(expectedPrefix)) return rawUrl;
    const wrongPrefix = `${base}/`;
    if (rawUrl.startsWith(wrongPrefix) && !rawUrl.startsWith(expectedPrefix)) {
      return `${expectedPrefix}${key}`;
    }
    return rawUrl;
  }

  private async sendCompanyMaterials(
    bot: BotConnection,
    chatId: number,
    materials: Array<{
      title?: string;
      fileName?: string;
      mime?: string;
      kind?: string;
      url?: string;
      key?: string;
      groupId?: string | null;
    }>,
  ) {
    const token = this.encryption.decrypt(bot.tokenEncrypted);
    const valid = materials.filter((m) => m.url).slice(0, 20);
    const groups = new Map<string, typeof valid>();
    const singles: typeof valid = [];
    for (const m of valid) {
      const gid = String(m.groupId || "").trim();
      if (gid) {
        groups.set(gid, [...(groups.get(gid) || []), m]);
      } else {
        singles.push(m);
      }
    }
    for (const [gid, rows] of groups.entries()) {
      const media = rows
        .map((m) => {
          const kind = this.inferMaterialKind(m);
          const resolvedUrl = this.resolveMaterialUrl(m);
          if (!["photo", "video", "document"].includes(kind)) return null;
          return {
            type: kind,
            media: resolvedUrl,
            caption: m.title || gid,
          };
        })
        .filter(Boolean);
      if (!media.length) continue;
      await axios.post(`https://api.telegram.org/bot${token}/sendMediaGroup`, {
        chat_id: chatId,
        media,
      });
    }
    for (const m of singles) {
      const kind = this.inferMaterialKind(m);
      const caption = m.title || "";
      const resolvedUrl = this.resolveMaterialUrl(m);
      if (kind === "photo") {
        await axios.post(`https://api.telegram.org/bot${token}/sendPhoto`, {
          chat_id: chatId,
          photo: resolvedUrl,
          caption,
        });
        continue;
      }
      if (kind === "video") {
        await axios.post(`https://api.telegram.org/bot${token}/sendVideo`, {
          chat_id: chatId,
          video: resolvedUrl,
          caption,
        });
        continue;
      }
      if (kind === "voice") {
        await axios.post(`https://api.telegram.org/bot${token}/sendVoice`, {
          chat_id: chatId,
          voice: resolvedUrl,
          caption,
        });
        continue;
      }
      if (kind === "video_note") {
        await axios.post(`https://api.telegram.org/bot${token}/sendVideoNote`, {
          chat_id: chatId,
          video_note: resolvedUrl,
        });
        continue;
      }
      await axios.post(`https://api.telegram.org/bot${token}/sendDocument`, {
        chat_id: chatId,
        document: resolvedUrl,
        caption,
      });
    }
  }

  private buildCompanyKeyboard(
    query: string,
    items: Company[],
    page: number,
    hasNext: boolean,
  ) {
    const inline_keyboard: Array<Array<{ text: string; callback_data: string }>> =
      [];
    for (const c of items) {
      inline_keyboard.push([
        {
          text: c.name,
          callback_data: `cmp:${c.id}`,
        },
      ]);
    }
    const nav: Array<{ text: string; callback_data: string }> = [];
    if (page > 0) {
      nav.push({
        text: "◀ Назад",
        callback_data: `srch:${encodeURIComponent(query)}:${page - 1}`,
      });
    }
    if (hasNext) {
      nav.push({
        text: "Вперёд ▶",
        callback_data: `srch:${encodeURIComponent(query)}:${page + 1}`,
      });
    }
    if (nav.length) inline_keyboard.push(nav);
    return { inline_keyboard };
  }

  private async sendCompanySearchResult(
    bot: BotConnection,
    chatId: number,
    query: string,
    page: number,
  ) {
    const list = await this.searchCompanies(query, page);
    const hasNext = list.length === 5;
    const text = list.length
      ? "Выберите компанию из списка:"
      : "Компаний не найдено. Попробуйте другое название.";
    const markup = this.buildCompanyKeyboard(query, list, page, hasNext);
    await this.sendChatMessage(bot, chatId, text, { inline_keyboard: markup.inline_keyboard });
  }

  private async askPhone(
    bot: BotConnection,
    chatId: number,
    aiText?: string | null,
  ) {
    await this.sendChatMessage(
      bot,
      chatId,
      aiText ?? "Укажите телефон. Можно отправить контактом через кнопку ниже или написать вручную.",
      {
        keyboard: [
          [{ text: "📱 Поделиться телефоном", request_contact: true }],
        ],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    );
  }

  private async clearKeyboard(bot: BotConnection, chatId: number) {
    await this.sendChatMessage(bot, chatId, "Принято.", {
      remove_keyboard: true,
    });
  }

  private async answerCallback(bot: BotConnection, callbackQueryId: string) {
    try {
      const token = this.encryption.decrypt(bot.tokenEncrypted);
      await axios.post(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
        callback_query_id: callbackQueryId,
      });
    } catch {}
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
    const cb = (update as { callback_query?: Record<string, unknown> })
      ?.callback_query;
    const fromRaw = (msg?.from || cb?.from) as { id?: number } | undefined;
    const chatRaw = (msg?.chat ||
      (cb?.message as { chat?: { id?: number } } | undefined)?.chat) as
      | { id?: number }
      | undefined;
    if (!fromRaw?.id || !chatRaw?.id) return;
    const from = fromRaw;
    const chat = chatRaw;
    const fromId = from.id;
    const chatId = chat?.id;
    if (fromId == null || chatId == null) return;
    if (!this.allow(String(fromId))) return;
    logInfo(this.log, "telegram_update_received", {
      botId: bot.id,
      fromId: String(fromId),
      chatId,
    });

    const text =
      typeof msg?.text === "string" ? msg.text.trim() : "";
    const contactPhone =
      (msg?.contact as { phone_number?: string } | undefined)?.phone_number ||
      "";
    const callbackData =
      typeof cb?.data === "string" ? cb.data : "";
    const yesAnswer = /^(да|ага|угу|ок|окей|конечно|покажи|давай)$/i.test(text);
    const noAnswer = /^(нет|не надо|не нужно|потом|неа)$/i.test(text);

    const aiReply = async (state: string, ctx: Record<string, unknown>) => {
      if (!this.timewebAi.isEnabled()) return null;
      const targetCompanyId = this.isSharedBot(bot)
        ? String((ctx.targetCompanyId as string) || "")
        : bot.companyId;
      const profile = targetCompanyId
        ? await this.companies.findOne({ where: { id: targetCompanyId } })
        : null;
      return this.timewebAi.salesAssistantReply({
        state,
        context: ctx,
        userText:
          this.sanitizeUserText(text) ||
          (contactPhone ? `[contact:${contactPhone}]` : ""),
        isStart: text.startsWith("/start"),
        companyProfile: {
          companyName: profile?.name,
          description: profile?.description,
          botObjective: profile?.botObjective,
        },
      });
    };

    const saveIncoming = async (conversation: Conversation) => {
      const pieces: Array<{ role: string; text: string }> = [];
      if (text && !text.startsWith("/start")) pieces.push({ role: "user", text });
      if (contactPhone) pieces.push({ role: "user", text: `Контакт: ${contactPhone}` });
      for (const part of pieces) {
        await this.messages.save(
          this.messages.create({
            conversationId: conversation.id,
            companyId: conversation.companyId,
            role: part.role,
            text: part.text,
            attachments: [],
          }),
        );
      }
    };

    let c = await this.conv.findOne({
      where: { botConnectionId: bot.id, telegramUserId: String(fromId) },
      order: { createdAt: "DESC" },
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
    c.context = { ...(c.context || {}), chatId };
    c = await this.conv.save(c);
    const ctx = (c.context || {}) as Record<string, unknown>;

    const send = async (replyText: string) => {
      await this.sendChatMessage(bot, chatId, replyText);
      await this.messages.save(
        this.messages.create({
          conversationId: c.id,
          companyId: c.companyId,
          role: "assistant",
          text: replyText,
          attachments: [],
        }),
      );
    };

    if (callbackData.startsWith("cmp:")) {
      const selectedCompanyId = callbackData.slice(4);
      const company = await this.companies.findOne({
        where: { id: selectedCompanyId, isActive: true },
      });
      if (cb?.id && typeof cb.id === "string") {
        await this.answerCallback(bot, cb.id);
      }
      if (!company) {
        await send("Компания не найдена, попробуйте ещё раз.");
        return;
      }
      c.context = { ...ctx, targetCompanyId: company.id };
      c.companyId = company.id;
      c.state = "ASK_NAME";
      await this.conv.save(c);
      await send(`Вы выбрали компанию «${company.name}». Как вас зовут?`);
      return;
    }

    if (callbackData.startsWith("srch:")) {
      const [, queryEncoded, pageRaw] = callbackData.split(":");
      const query = decodeURIComponent(queryEncoded || "");
      const page = Number(pageRaw || "0");
      if (cb?.id && typeof cb.id === "string") {
        await this.answerCallback(bot, cb.id);
      }
      await this.sendCompanySearchResult(
        bot,
        chatId,
        query,
        Number.isFinite(page) && page >= 0 ? page : 0,
      );
      return;
    }

    if (text.startsWith("/start")) {
      const payload = this.parseStartPayload(text);
      if (this.isSharedBot(bot)) {
        const company = await this.getCompanyByStartPayload(payload);
        if (company) {
          c.state = "ASK_NAME";
          c.companyId = company.id;
          c.context = { ...ctx, targetCompanyId: company.id, chatId };
          await this.conv.save(c);
          await send(`Вы выбрали компанию «${company.name}». Как вас зовут?`);
          return;
        }
        c.state = "PICK_COMPANY";
        c.context = {};
        await this.conv.save(c);
        await send(
          "Привет! Напишите название компании, чтобы я показал подходящие варианты.",
        );
        return;
      }
      c.state = "ASK_NAME";
      c.context = {};
      await this.conv.save(c);
      const ar = await aiReply("ASK_NAME", {});
      await send(ar ?? "Здравствуйте! Как вас зовут?");
      return;
    }

    if (this.isSharedBot(bot) && !ctx.targetCompanyId && c.state === "PICK_COMPANY") {
      if (!text) {
        await send("Напишите название компании текстом.");
        return;
      }
      await saveIncoming(c);
      c.state = "PICK_COMPANY";
      await this.conv.save(c);
      await this.sendCompanySearchResult(bot, chatId, text, 0);
      return;
    }

    const currentCompanyId = this.isSharedBot(bot)
      ? String((ctx.targetCompanyId as string) || c.companyId || "")
      : bot.companyId;
    const currentCompany = currentCompanyId
      ? await this.companies.findOne({ where: { id: currentCompanyId } })
      : null;
    const materials =
      ((currentCompany?.botMaterials as Array<{
        title?: string;
        fileName?: string;
        mime?: string;
        kind?: string;
        url?: string;
        key?: string;
        groupId?: string | null;
      }>) || []).filter((x) => x.url);
    const ctxAskMaterials = Boolean((ctx as Record<string, unknown>).askMaterialsConfirm);
    if (ctxAskMaterials && yesAnswer && materials.length) {
      await this.sendCompanyMaterials(bot, chatId, materials);
      c.context = { ...ctx, askMaterialsConfirm: false };
      await this.conv.save(c);
      await send("Отправил(а) материалы. Если понадобится, помогу с выбором.");
      return;
    }
    if (ctxAskMaterials && noAnswer) {
      c.context = { ...ctx, askMaterialsConfirm: false };
      await this.conv.save(c);
      await send("Хорошо, тогда продолжим без материалов.");
      return;
    }
    const asksForMaterials = /(меню|каталог|прайс|видео|фото|материал|пример|портфолио)/i.test(
      text,
    );
    if (materials.length && asksForMaterials && !ctxAskMaterials) {
      c.context = { ...ctx, askMaterialsConfirm: true };
      await this.conv.save(c);
      await send("Могу отправить материалы компании. Отправить сейчас?");
      return;
    }

    if (c.state === "ASK_NAME") {
      if (!text) {
        await send("Введите имя текстом.");
        return;
      }
      await saveIncoming(c);
      c.context = { ...ctx, name: text };
      c.state = "ASK_PHONE";
      await this.conv.save(c);
      const ar = await aiReply("ASK_PHONE", c.context as Record<string, unknown>);
      await this.askPhone(bot, chatId, ar);
      return;
    }
    if (c.state === "ASK_PHONE") {
      const phone = contactPhone || text;
      if (!phone) {
        await this.askPhone(bot, chatId);
        return;
      }
      await saveIncoming(c);
      c.context = { ...ctx, phone };
      c.state = "ASK_NEED";
      await this.conv.save(c);
      await this.clearKeyboard(bot, chatId);
      const ar = await aiReply("ASK_NEED", c.context as Record<string, unknown>);
      const tail = materials.length
        ? "\nЕсли хотите, могу сразу отправить меню/каталог и примеры."
        : "";
      await send((ar ?? "Подскажите, с каким вопросом помочь?") + tail);
      return;
    }
    if (c.state === "ASK_NEED") {
      if (!text) {
        await send("Опишите, пожалуйста, ваш запрос текстом.");
        return;
      }
      await saveIncoming(c);
      const targetCompanyId = this.isSharedBot(bot)
        ? String((ctx.targetCompanyId as string) || "")
        : bot.companyId;
      if (!targetCompanyId) {
        c.state = "PICK_COMPANY";
        c.context = {};
        await this.conv.save(c);
        await send("Сначала выберите компанию.");
        return;
      }
      const can = await this.billing.canCreateLead(targetCompanyId);
      if (!can) {
        await send("Лимит лидов на тарифе исчерпан. Попробуйте позже.");
        return;
      }
      const existingLead = await this.leads.getByConversationId(c.id);
      if (!existingLead) {
        await this.leads.createLead({
          companyId: targetCompanyId,
          conversationId: c.id,
          fullName: String((c.context as Record<string, unknown>).name || "Unknown"),
          phone: String((c.context as Record<string, unknown>).phone || ""),
          need: text,
          source: "telegram_bot",
          details: {
            telegramUserId: String(fromId),
            botConnectionId: bot.id,
          },
        });
        await this.billing.incrementLead(targetCompanyId);
      logInfo(this.log, "lead_created_from_telegram", {
        botId: bot.id,
        companyId: targetCompanyId,
        conversationId: c.id,
        fromId: String(fromId),
      });
      }
      c.state = "DONE";
      c.companyId = targetCompanyId;
      await this.conv.save(c);
      const doneCtx = { ...c.context, need: text };
      const ar = await aiReply("DONE", doneCtx as Record<string, unknown>);
      await send(ar ?? "Спасибо, заявку передал(а) коллегам. Если нужно, могу помочь с уточнениями.");
      return;
    }

    if (c.state === "DONE") {
      if (!text) {
        await send("Я на связи. Могу помочь с уточнениями по вашей заявке.");
        return;
      }
      const wantsNewRequest = /(нов\w+\s+заявк|ещ[её]\s+заявк|другой\s+вопрос|новый\s+запрос)/i.test(
        text,
      );
      if (wantsNewRequest) {
        c.state = "ASK_NEED";
        await this.conv.save(c);
        await send("Отлично, расскажите, пожалуйста, что нужно сейчас.");
        return;
      }
      const ar = await aiReply("DONE", c.context as Record<string, unknown>);
      await send(
        ar ??
          "Понял вас. Если хотите, могу оформить еще одну заявку: просто напишите «новая заявка».",
      );
    }
  }

  private async sendChatMessage(
    bot: BotConnection,
    chatId: number,
    text: string,
    replyMarkup?: Record<string, unknown>,
  ) {
    try {
      const token = this.encryption.decrypt(bot.tokenEncrypted);
      await axios.post(`https://api.telegram.org/bot${token}/sendChatAction`, {
        chat_id: chatId,
        action: "typing",
      });
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
        chat_id: chatId,
        text,
        ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
      });
    } catch (e) {
      logError(this.log, "telegram_send_message_failed", {
        botId: bot.id,
        chatId,
        message: e instanceof Error ? e.message : "telegram_send_error",
      });
    }
  }
}
