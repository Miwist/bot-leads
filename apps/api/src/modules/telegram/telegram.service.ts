import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import axios from "axios";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { writeFile, unlink, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
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
import { logError, logInfo, logWarn } from "../../common/logging";
import { ManagersService } from "../managers/managers.service";
import { AdminTelegramService } from "../../common/admin-telegram.service";
import {
  classifyTelegramDocument,
  TELEGRAM_MULTIMODAL_MAX_BYTES,
} from "./telegram-file-policy";

const execFileAsync = promisify(execFile);
const MAX_TG_DOWNLOAD_BYTES = TELEGRAM_MULTIMODAL_MAX_BYTES;

@Injectable()
export class TelegramService {
  private readonly log = new Logger(TelegramService.name);
  private buckets = new Map<string, number[]>();
  private processedUpdateIds = new Map<string, number>();
  private processedUpdateIdsCounter = 0;

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
    private managers: ManagersService,
    private adminTelegram: AdminTelegramService,
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

  private dedupeUpdate(botId: string, update: unknown): boolean {
    const updateId = Number((update as { update_id?: unknown })?.update_id);
    if (!Number.isFinite(updateId)) return false;
    const key = `${botId}:${updateId}`;
    if (this.processedUpdateIds.has(key)) return true;
    this.processedUpdateIds.set(key, Date.now());
    this.processedUpdateIdsCounter += 1;
    // Lightweight periodic cleanup to avoid unbounded memory growth.
    if (this.processedUpdateIdsCounter % 200 === 0) {
      const cutoff = Date.now() - 10 * 60 * 1000;
      for (const [k, ts] of this.processedUpdateIds.entries()) {
        if (ts < cutoff) this.processedUpdateIds.delete(k);
      }
    }
    return false;
  }

  private isManagerHoldActive(context: Record<string, unknown>): boolean {
    const raw = String(context.managerHoldUntil || "").trim();
    if (!raw) return false;
    const until = new Date(raw);
    if (Number.isNaN(until.getTime())) return false;
    return until.getTime() > Date.now();
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

  private isMyInfoCommand(text: string): boolean {
    const cmd = String(text || "")
      .trim()
      .toLowerCase();
    return /^\/(getmyinfo|myid|id)(?:@\w+)?$/.test(cmd);
  }

  private asksForManager(text: string): boolean {
    const t = String(text || "").trim().toLowerCase();
    if (!t) return false;
    return /(менедж|оператор|человек|жив(ой|ого)|сотрудник|переключи|позови)/i.test(
      t,
    );
  }

  private async notifyManagerByChatId(
    bot: BotConnection,
    managerChatId: string,
    text: string,
  ) {
    const token = this.encryption.decrypt(bot.tokenEncrypted);
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: managerChatId,
      text,
    });
  }

  private buildMyInfoText(input: {
    fromId: number;
    chatId: number;
    username?: string;
    firstName?: string;
  }): string {
    const lines = [
      "Ваши данные Telegram:",
      `• user_id: ${input.fromId}`,
      `• chat_id: ${input.chatId}`,
    ];
    if (input.username) lines.push(`• username: @${input.username}`);
    if (input.firstName) lines.push(`• имя: ${input.firstName}`);
    lines.push("");
    lines.push(
      "Скопируйте chat_id и вставьте его в настройках кабинета в поле «Telegram ID».",
    );
    return lines.join("\n");
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
      .replace(
        /(?:token|secret|парол\w*|ключ\w*|jwt|id компании)\s*[:=].*/gi,
        "[скрыто]",
      )
      .slice(0, 2000);
  }

  private inferMaterialKind(item: {
    kind?: string;
    mime?: string;
    fileName?: string;
  }) {
    const mime = String(item.mime || "").toLowerCase();
    const fileName = String(item.fileName || "").toLowerCase();
    if (item.kind && item.kind !== "auto" && item.kind !== "group") {
      if (
        item.kind === "photo" &&
        (mime === "application/pdf" ||
          fileName.endsWith(".pdf") ||
          (!mime.startsWith("image/") &&
            /\.(pdf|doc|docx|zip)$/.test(fileName)))
      ) {
        return "document";
      }
      return item.kind;
    }
    if (mime.startsWith("image/")) return "photo";
    if (mime.startsWith("video/")) return "video";
    if (mime.startsWith("audio/ogg") || fileName.endsWith(".ogg"))
      return "voice";
    if (mime.startsWith("audio/")) return "document";
    return "document";
  }

  private tgCaption(text: string) {
    return String(text || "")
      .trim()
      .slice(0, 1024);
  }

  private extractTelegramErrorDescription(error: unknown) {
    if (!axios.isAxiosError(error)) return "";
    const data = error.response?.data as { description?: unknown } | undefined;
    return String(data?.description || error.message || "").trim();
  }

  private shouldFallbackToMultipart(error: unknown) {
    const text = this.extractTelegramErrorDescription(error).toLowerCase();
    if (!text) return false;
    return [
      "failed to get http url content",
      "wrong file identifier/http url specified",
      "wrong type of the web page content",
      "webpage_curl_failed",
      "download failed",
      "wrong file_id or the file is temporarily unavailable",
    ].some((mark) => text.includes(mark));
  }

  private async downloadMaterial(
    url: string,
    opts?: { maxBytes?: number },
  ): Promise<Buffer> {
    const maxBytes = opts?.maxBytes ?? 45 * 1024 * 1024;
    const res = await axios.get<ArrayBuffer>(url, {
      responseType: "arraybuffer",
      timeout: 30000,
      maxContentLength: maxBytes,
      maxBodyLength: maxBytes,
      validateStatus: (status) => status >= 200 && status < 300,
    });
    const bytes = Buffer.from(res.data);
    if (bytes.length > maxBytes) {
      throw new Error(`material_too_large:${bytes.length}`);
    }
    return bytes;
  }

  private async postTgMultipart(
    token: string,
    method: string,
    fields: Record<string, string>,
    file: {
      fieldName: string;
      fileName: string;
      mime: string;
      bytes: Buffer;
    },
  ): Promise<void> {
    const form = new FormData();
    for (const [k, v] of Object.entries(fields)) form.append(k, v);
    form.append(
      file.fieldName,
      new Blob([new Uint8Array(file.bytes)], {
        type: file.mime || "application/octet-stream",
      }),
      file.fileName || "file",
    );
    const response = await fetch(
      `https://api.telegram.org/bot${token}/${method}`,
      {
        method: "POST",
        body: form,
      },
    );
    const data = (await response.json().catch(() => null)) as {
      ok?: boolean;
      description?: string;
    } | null;
    if (!response.ok || !data?.ok) {
      throw new Error(
        `telegram_multipart_failed:${response.status}:${String(data?.description || "request_error")}`,
      );
    }
  }

  private getSendMethodByKind(kind: string): {
    method: string;
    mediaField: string;
  } {
    if (kind === "photo") return { method: "sendPhoto", mediaField: "photo" };
    if (kind === "video") return { method: "sendVideo", mediaField: "video" };
    if (kind === "voice") return { method: "sendVoice", mediaField: "voice" };
    if (kind === "video_note")
      return { method: "sendVideoNote", mediaField: "video_note" };
    return { method: "sendDocument", mediaField: "document" };
  }

  private resolveMaterialUrl(item: { url?: string; key?: string }) {
    const rawUrl = String(item.url || "").trim();
    if (!rawUrl) return "";
    const base = String(process.env.S3_PUBLIC_BASE_URL || "")
      .trim()
      .replace(/\/+$/g, "");
    const bucket = String(process.env.S3_BUCKET || "").trim();
    const key = String(item.key || "")
      .trim()
      .replace(/^\/+/, "");
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

    const postTg = async (method: string, body: Record<string, unknown>) => {
      try {
        await axios.post(
          `https://api.telegram.org/bot${token}/${method}`,
          body,
        );
      } catch (e) {
        const ax = axios.isAxiosError(e) ? e : null;
        const desc = ax?.response?.data as { description?: string } | undefined;
        logError(this.log, "telegram_send_material_failed", {
          botId: bot.id,
          method,
          status: ax?.response?.status,
          telegram: desc?.description || ax?.message || "request_error",
        });
        throw e;
      }
    };

    const sendSingle = async (m: (typeof valid)[number]) => {
      const kind = this.inferMaterialKind(m);
      const caption = this.tgCaption(m.title || "");
      const resolvedUrl = this.resolveMaterialUrl(m);
      if (resolvedUrl.startsWith("data:")) {
        logWarn(this.log, "telegram_material_skip_data_url", {
          botId: bot.id,
          title: m.title,
        });
        return;
      }
      const { method, mediaField } = this.getSendMethodByKind(kind);
      const body: Record<string, unknown> = {
        chat_id: chatId,
        [mediaField]: resolvedUrl,
      };
      if (caption && method !== "sendVideoNote") body.caption = caption;
      try {
        await postTg(method, body);
        return;
      } catch (e) {
        if (!this.shouldFallbackToMultipart(e)) throw e;
      }
      try {
        const bytes = await this.downloadMaterial(resolvedUrl);
        await this.postTgMultipart(
          token,
          method,
          {
            chat_id: String(chatId),
            ...(caption && method !== "sendVideoNote" ? { caption } : {}),
          },
          {
            fieldName: mediaField,
            fileName: String(m.fileName || m.title || "material"),
            mime: String(m.mime || "application/octet-stream"),
            bytes,
          },
        );
        logInfo(this.log, "telegram_material_fallback_multipart", {
          botId: bot.id,
          method,
          title: m.title || null,
        });
      } catch (uploadError) {
        logError(this.log, "telegram_send_material_multipart_failed", {
          botId: bot.id,
          method,
          title: m.title || null,
          message:
            uploadError instanceof Error ? uploadError.message : "upload_error",
        });
        throw uploadError;
      }
    };

    for (const [gid, rows] of groups.entries()) {
      const media = rows
        .map((m) => {
          const kind = this.inferMaterialKind(m);
          const resolvedUrl = this.resolveMaterialUrl(m);
          if (resolvedUrl.startsWith("data:")) {
            logWarn(this.log, "telegram_material_skip_data_url", {
              botId: bot.id,
              title: m.title,
            });
            return null;
          }
          if (!["photo", "video", "document"].includes(kind)) return null;
          return {
            type: kind,
            media: resolvedUrl,
            caption: this.tgCaption(m.title || gid),
          };
        })
        .filter(Boolean);
      if (!media.length) continue;
      try {
        await postTg("sendMediaGroup", { chat_id: chatId, media });
      } catch (e) {
        // If group by URL fails (Telegram can't fetch source), send items one-by-one with multipart fallback.
        if (!this.shouldFallbackToMultipart(e)) throw e;
        logWarn(this.log, "telegram_media_group_fallback_singles", {
          botId: bot.id,
          groupId: gid,
          count: rows.length,
          reason: this.extractTelegramErrorDescription(e),
        });
        for (const row of rows) {
          await sendSingle(row);
        }
      }
    }
    for (const m of singles) await sendSingle(m);
  }

  private companyChoiceButtonLabel(c: Company) {
    const name = String(c.name || "").trim() || "Компания";
    const hint = String(c.clientDisambiguation || "").trim();
    const combined = hint ? `${name} — ${hint}` : name;
    const max = 64;
    if (combined.length <= max) return combined;
    return `${combined.slice(0, Math.max(1, max - 1))}…`;
  }

  private buildCompanyKeyboard(
    query: string,
    items: Company[],
    page: number,
    hasNext: boolean,
  ) {
    const inline_keyboard: Array<
      Array<{ text: string; callback_data: string }>
    > = [];
    for (const c of items) {
      inline_keyboard.push([
        {
          text: this.companyChoiceButtonLabel(c),
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
    const lines = list.map((c, i) => {
      const hint = String(c.clientDisambiguation || "").trim();
      const mark = `${i + 1}. ${c.name}`;
      return hint ? `${mark}\n   ↳ ${hint}` : mark;
    });
    const text = list.length
      ? [
          "Выберите компанию кнопкой ниже.",
          "Если названия похожи — ориентируйтесь по короткой подписи после «—».",
          "",
          ...lines,
        ].join("\n")
      : "Компаний не найдено. Попробуйте другое название.";
    const markup = this.buildCompanyKeyboard(query, list, page, hasNext);
    await this.sendChatMessage(bot, chatId, text, {
      inline_keyboard: markup.inline_keyboard,
    });
  }

  private async askPhone(
    bot: BotConnection,
    chatId: number,
    aiText?: string | null,
  ) {
    await this.sendChatMessage(
      bot,
      chatId,
      aiText ??
        "Укажите телефон. Можно отправить контактом через кнопку ниже или написать вручную.",
      {
        keyboard: [
          [{ text: "📱 Поделиться телефоном", request_contact: true }],
        ],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    );
  }

  private consentPolicyUrl() {
    const base = String(process.env.WEB_PUBLIC_URL || "")
      .trim()
      .replace(/\/+$/g, "");
    return base ? `${base}/privacy` : "";
  }

  private consentKeyboard() {
    const policyUrl = this.consentPolicyUrl();
    const row: Array<{ text: string; callback_data?: string; url?: string }> = [
      { text: "Согласен(на)", callback_data: "consent:yes" },
      { text: "Не согласен(на)", callback_data: "consent:no" },
    ];
    if (policyUrl) {
      row.push({ text: "Политика обработки данных", url: policyUrl });
    }
    return { inline_keyboard: [row] };
  }

  private async askConsent(
    bot: BotConnection,
    chatId: number,
    companyName?: string,
  ) {
    const target = companyName ? ` для компании «${companyName}»` : "";
    const policyUrl =
      this.consentPolicyUrl() ?? "https://ai.ventaria.ru/privacy";
    const policyLine = `Политика обработки данных: ${policyUrl}`;
    await this.sendChatMessage(
      bot,
      chatId,
      [
        `Чтобы продолжить диалог${target}, нужно ваше согласие на обработку персональных данных.`,
        "Нажимая «Согласен(на)», вы подтверждаете согласие на обработку переданных данных для связи по заявке.",
        policyLine,
      ].join("\n\n"),
      this.consentKeyboard(),
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
      await axios.post(
        `https://api.telegram.org/bot${token}/answerCallbackQuery`,
        {
          callback_query_id: callbackQueryId,
        },
      );
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
    if (this.dedupeUpdate(bot.id, update)) {
      logInfo(this.log, "telegram_update_skipped_duplicate", { botId: bot.id });
      return;
    }
    const userMsg = (update as { message?: Record<string, unknown> })?.message;
    const cb = (update as { callback_query?: Record<string, unknown> })
      ?.callback_query;
    const fromRaw = (userMsg?.from || cb?.from) as { id?: number } | undefined;
    const chatRaw = (userMsg?.chat ||
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

    const contactPhone =
      (userMsg?.contact as { phone_number?: string } | undefined)
        ?.phone_number || "";
    const callbackData = typeof cb?.data === "string" ? cb.data : "";

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
    const managerHoldActive = this.isManagerHoldActive(ctx);

    const send = async (replyText: string) => {
      const delivered = await this.sendChatMessage(bot, chatId, replyText);
      if (!delivered) return;
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
    const sendWithMarkup = async (
      replyText: string,
      replyMarkup: Record<string, unknown>,
    ) => {
      const delivered = await this.sendChatMessage(
        bot,
        chatId,
        replyText,
        replyMarkup,
      );
      if (!delivered) return;
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

    const rawText =
      typeof userMsg?.text === "string" ? userMsg.text.trim() : "";
    const caption =
      typeof userMsg?.caption === "string" ? userMsg.caption.trim() : "";

    if (this.isMyInfoCommand(rawText)) {
      await this.sendChatMessage(
        bot,
        chatId,
        this.buildMyInfoText({
          fromId,
          chatId,
          username:
            (fromRaw as { username?: string } | undefined)?.username || "",
          firstName:
            (fromRaw as { first_name?: string } | undefined)?.first_name || "",
        }),
      );
      return;
    }

    const userTextResolved = await this.resolveTelegramMultimodalUserText(
      bot,
      (userMsg || {}) as Record<string, unknown>,
      rawText,
      caption,
      c,
      ctx,
      send,
    );
    if (userTextResolved === null) return;
    const userTextForFlow = userTextResolved;

    const currentCompanyIdForEscalation = this.isSharedBot(bot)
      ? String((ctx.targetCompanyId as string) || c.companyId || "")
      : bot.companyId;
    if (
      !rawText.startsWith("/start") &&
      this.asksForManager(userTextForFlow) &&
      currentCompanyIdForEscalation
    ) {
      await this.messages.save(
        this.messages.create({
          conversationId: c.id,
          companyId: c.companyId,
          role: "user",
          text: userTextForFlow,
          attachments: [],
        }),
      );
      const manager = await this.managers.next(currentCompanyIdForEscalation);
      const managerContact = manager?.chatId ? String(manager.chatId) : "";
      const managerText = [
        "Эскалация из Telegram-бота.",
        `Компания: ${currentCompanyIdForEscalation}`,
        `Диалог: ${c.id}`,
        `Пользователь TG: ${fromId}`,
        `Запрос: ${userTextForFlow}`,
      ].join("\n");
      let managerNotified = false;
      if (managerContact) {
        try {
          await this.notifyManagerByChatId(bot, managerContact, managerText);
          managerNotified = true;
        } catch (err) {
          logError(this.log, "manager_notify_failed", {
            conversationId: c.id,
            companyId: currentCompanyIdForEscalation,
            managerId: manager?.id || null,
            message: err instanceof Error ? err.message : "notify_error",
          });
        }
      }
      await this.adminTelegram.notify(
        `[Escalation] company=${currentCompanyIdForEscalation}, conversation=${c.id}, managerNotified=${managerNotified}`,
      );
      await send(
        managerNotified
          ? "Передал(а) запрос менеджеру. Он подключится в ближайшее время."
          : "Передал(а) запрос старшему менеджеру. Если ответ задержится, мы свяжемся с вами дополнительно.",
      );
      c.context = {
        ...ctx,
        managerEscalatedAt: new Date().toISOString(),
      };
      await this.conv.save(c);
      logInfo(this.log, "manager_escalation_requested", {
        conversationId: c.id,
        companyId: currentCompanyIdForEscalation,
        managerNotified,
      });
      return;
    }

    const yesAnswer = /^(да|ага|угу|ок|окей|конечно|покажи|давай)$/i.test(
      userTextForFlow,
    );
    const noAnswer = /^(нет|не надо|не нужно|потом|неа)$/i.test(
      userTextForFlow,
    );

    const aiReply = async (state: string, ctxArg: Record<string, unknown>) => {
      if (managerHoldActive) return null;
      if (!this.timewebAi.isEnabled()) return null;
      const targetCompanyId = this.isSharedBot(bot)
        ? String((ctxArg.targetCompanyId as string) || "")
        : bot.companyId;
      const profile = targetCompanyId
        ? await this.companies.findOne({ where: { id: targetCompanyId } })
        : null;
      return this.timewebAi.salesAssistantReply({
        state,
        context: ctxArg,
        userText:
          this.sanitizeUserText(userTextForFlow) ||
          (contactPhone ? `[contact:${contactPhone}]` : ""),
        isStart: rawText.startsWith("/start"),
        companyProfile: {
          companyName: profile?.name,
          description: profile?.description,
          botObjective: profile?.botObjective,
          communicationTone: profile?.communicationTone,
          assistantInstruction: profile?.assistantInstruction,
        },
      });
    };

    const saveIncoming = async (conversation: Conversation) => {
      const pieces: Array<{ role: string; text: string }> = [];
      if (userTextForFlow && !rawText.startsWith("/start"))
        pieces.push({ role: "user", text: userTextForFlow });
      if (contactPhone)
        pieces.push({ role: "user", text: `Контакт: ${contactPhone}` });
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
      if (
        pieces.some((p) => p.role === "user") &&
        this.isManagerHoldActive(ctx) &&
        String(c.state || "") === "DONE"
      ) {
        c.context = {
          ...ctx,
          managerHoldUntil: null,
          managerTakeoverAt: null,
          managerEscalatedAt: null,
        };
        await this.conv.save(c);
      }
    };

    const ensureLeadFromFirstMessageIfNeeded = async (opts: {
      companyId: string;
      enabled: boolean;
      text: string;
      fromId: number;
    }) => {
      if (!opts.enabled) return;
      if (!opts.text.trim()) return;
      const existingLead = await this.leads.getByConversationId(c.id);
      if (existingLead) return;
      const can = await this.billing.canCreateLead(opts.companyId);
      if (!can) return;
      const accounting = await this.billing.incrementLead(opts.companyId);
      try {
        await this.leads.createLead({
          companyId: opts.companyId,
          conversationId: c.id,
          fullName: String((c.context as Record<string, unknown>).name || "Не указан"),
          phone: String((c.context as Record<string, unknown>).phone || ""),
          need: opts.text.trim(),
          source: "telegram_bot",
          details: {
            telegramUserId: String(opts.fromId),
            botConnectionId: bot.id,
            createdFromFirstMessage: true,
          },
        });
      } catch (err) {
        await this.billing.rollbackIncrementLead(opts.companyId, accounting);
        throw err;
      }
      logInfo(this.log, "lead_created_from_first_client_message", {
        botId: bot.id,
        companyId: opts.companyId,
        conversationId: c.id,
      });
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
      c.context = {
        ...ctx,
        targetCompanyId: company.id,
        pdConsentAccepted: false,
      };
      c.companyId = company.id;
      c.state = "ASK_CONSENT";
      await this.conv.save(c);
      await this.askConsent(bot, chatId, company.name);
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

    if (rawText.startsWith("/start")) {
      const payload = this.parseStartPayload(rawText);
      if (this.isSharedBot(bot)) {
        const company = await this.getCompanyByStartPayload(payload);
        if (company) {
          c.state = "ASK_CONSENT";
          c.companyId = company.id;
          c.context = {
            ...ctx,
            targetCompanyId: company.id,
            chatId,
            pdConsentAccepted: false,
          };
          await this.conv.save(c);
          await this.askConsent(bot, chatId, company.name);
          return;
        }
        c.state = "PICK_COMPANY";
        c.context = {};
        await this.conv.save(c);
        await send(
          "Здравствуйте! Напишите название компании, чтобы я показал подходящие варианты.",
        );
        return;
      }
      c.state = "ASK_CONSENT";
      c.companyId = bot.companyId;
      c.context = {
        ...ctx,
        targetCompanyId: bot.companyId,
        chatId,
        pdConsentAccepted: false,
      };
      await this.conv.save(c);
      const ownCompany = await this.companies.findOne({
        where: { id: bot.companyId, isActive: true },
      });
      const customWelcome = ownCompany?.welcomeMessage?.trim();
      if (customWelcome) {
        await send(customWelcome);
        await this.askConsent(bot, chatId, ownCompany?.name || undefined);
        return;
      }
      const ar = await aiReply("ASK_CONSENT", {
        targetCompanyId: bot.companyId,
      });
      await send(
        ar ??
          "Здравствуйте! Прежде чем продолжить, подтвержу согласие на обработку данных.",
      );
      await this.askConsent(bot, chatId, ownCompany?.name || undefined);
      return;
    }

    if (
      this.isSharedBot(bot) &&
      !ctx.targetCompanyId &&
      c.state === "PICK_COMPANY"
    ) {
      if (!userTextForFlow) {
        await send("Напишите название компании текстом.");
        return;
      }
      await saveIncoming(c);
      c.state = "PICK_COMPANY";
      await this.conv.save(c);
      await this.sendCompanySearchResult(bot, chatId, userTextForFlow, 0);
      return;
    }

    const currentCompanyId = this.isSharedBot(bot)
      ? String((ctx.targetCompanyId as string) || c.companyId || "")
      : bot.companyId;
    const currentCompany = currentCompanyId
      ? await this.companies.findOne({ where: { id: currentCompanyId } })
      : null;
    if (
      currentCompanyId &&
      !callbackData &&
      !rawText.startsWith("/start") &&
      userTextForFlow.trim() &&
      Boolean(currentCompany?.createLeadFromFirstMessage) &&
      String(c.state || "") !== "CONSENT_DECLINED"
    ) {
      await ensureLeadFromFirstMessageIfNeeded({
        companyId: currentCompanyId,
        enabled: true,
        text: userTextForFlow,
        fromId,
      });
    }
    const materials = (
      (currentCompany?.botMaterials as Array<{
        title?: string;
        fileName?: string;
        mime?: string;
        kind?: string;
        url?: string;
        key?: string;
        groupId?: string | null;
      }>) || []
    ).filter((x) => x.url);
    if (callbackData === "consent:yes") {
      if (cb?.id && typeof cb.id === "string") {
        await this.answerCallback(bot, cb.id);
      }
      c.context = { ...ctx, pdConsentAccepted: true };
      c.state = "ASK_NAME";
      await this.conv.save(c);
      await send("Спасибо! Согласие принято. Как вас зовут?");
      return;
    }
    if (callbackData === "consent:no") {
      if (cb?.id && typeof cb.id === "string") {
        await this.answerCallback(bot, cb.id);
      }
      c.context = { ...ctx, pdConsentAccepted: false };
      c.state = "CONSENT_DECLINED";
      await this.conv.save(c);
      await send(
        "Понял(а). Без согласия не могу собирать контактные данные. Если передумаете, отправьте /start.",
      );
      return;
    }
    if (
      c.state !== "PICK_COMPANY" &&
      c.state !== "ASK_CONSENT" &&
      c.state !== "CONSENT_DECLINED" &&
      !Boolean((ctx as Record<string, unknown>).pdConsentAccepted)
    ) {
      c.state = "ASK_CONSENT";
      await this.conv.save(c);
      await this.askConsent(
        bot,
        chatId,
        currentCompany?.name ? String(currentCompany.name) : undefined,
      );
      return;
    }
    const materialsKeyboard = {
      inline_keyboard: [
        [{ text: "Показать материалы", callback_data: "mat:send" }],
      ],
    };
    if (callbackData === "mat:send") {
      if (cb?.id && typeof cb.id === "string") {
        await this.answerCallback(bot, cb.id);
      }
      if (!materials.length) {
        await send(
          "Сейчас в настройках компании нет материалов. Могу продолжить диалог и помочь с заявкой.",
        );
        return;
      }
      await this.sendCompanyMaterials(bot, chatId, materials);
      c.context = { ...ctx, askMaterialsConfirm: false };
      await this.conv.save(c);
      await send("Готово, отправил(а) материалы в этот чат.");
      return;
    }
    const ctxAskMaterials = Boolean(
      (ctx as Record<string, unknown>).askMaterialsConfirm,
    );
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
    const asksForMaterials =
      /(меню|каталог|прайс|видео|фото|материал|пример|портфолио|файл|файлы|документ|документы|скинь|пришли|отправь)/i.test(
        userTextForFlow,
      );
    if (asksForMaterials) {
      if (!currentCompanyId && this.isSharedBot(bot)) {
        await send(
          "Чтобы отправить материалы, сначала выберите компанию: напишите ее название.",
        );
        return;
      }
      if (!materials.length) {
        await send(
          "Пока не вижу материалов в настройках компании. Могу помочь оформить заявку или уточнить ваш запрос.",
        );
        return;
      }
      await this.sendCompanyMaterials(bot, chatId, materials);
      c.context = { ...ctx, askMaterialsConfirm: false };
      await this.conv.save(c);
      if (c.state === "ASK_NAME") {
        await send(
          "Материалы отправил(а). Если удобно, подскажите, как к вам обращаться?",
        );
        return;
      }
      if (c.state === "ASK_PHONE") {
        await sendWithMarkup(
          "Материалы отправил(а). Если хотите продолжить, напишите номер телефона или поделитесь контактом кнопкой.",
          {
            keyboard: [[{ text: "Отправить контакт", request_contact: true }]],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        );
        return;
      }
      await send("Материалы отправил(а) в этот чат.");
      return;
    }

    if (c.state === "ASK_CONSENT") {
      await this.askConsent(
        bot,
        chatId,
        currentCompany?.name ? String(currentCompany.name) : undefined,
      );
      return;
    }

    if (c.state === "ASK_NAME") {
      if (!userTextForFlow) {
        await send("Введите имя текстом.");
        return;
      }
      await saveIncoming(c);
      c.context = { ...ctx, name: userTextForFlow };
      c.state = "ASK_PHONE";
      await this.conv.save(c);
      const ar = await aiReply(
        "ASK_PHONE",
        c.context as Record<string, unknown>,
      );
      await this.askPhone(bot, chatId, ar);
      return;
    }
    if (c.state === "ASK_PHONE") {
      const phone = contactPhone || userTextForFlow;
      if (!phone) {
        await this.askPhone(bot, chatId);
        return;
      }
      await saveIncoming(c);
      c.context = { ...ctx, phone };
      c.state = "ASK_NEED";
      await this.conv.save(c);
      await this.clearKeyboard(bot, chatId);
      const ar = await aiReply(
        "ASK_NEED",
        c.context as Record<string, unknown>,
      );
      if (materials.length) {
        await sendWithMarkup(
          (ar ?? "Подскажите, с каким вопросом помочь?") +
            "\nЕсли нужно, могу показать материалы компании.",
          materialsKeyboard,
        );
      } else {
        await send(ar ?? "Подскажите, с каким вопросом помочь?");
      }
      return;
    }
    if (c.state === "ASK_NEED") {
      if (!userTextForFlow) {
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
        await send(
          "Лимит заявок на тарифе исчерпан. Владелец может пополнить предоплату в кабинете: Тарифы → произвольная сумма, либо дождаться следующего месяца.",
        );
        return;
      }
      const existingLead = await this.leads.getByConversationId(c.id);
      if (!existingLead) {
        const accounting = await this.billing.incrementLead(targetCompanyId);
        try {
          await this.leads.createLead({
            companyId: targetCompanyId,
            conversationId: c.id,
            fullName: String(
              (c.context as Record<string, unknown>).name || "Unknown",
            ),
            phone: String((c.context as Record<string, unknown>).phone || ""),
            need: userTextForFlow,
            source: "telegram_bot",
            details: {
              telegramUserId: String(fromId),
              botConnectionId: bot.id,
            },
          });
        } catch (err) {
          await this.billing.rollbackIncrementLead(targetCompanyId, accounting);
          throw err;
        }
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
      const doneCtx = { ...c.context, need: userTextForFlow };
      const ar = await aiReply("DONE", doneCtx as Record<string, unknown>);
      await send(
        ar ??
          "Спасибо, заявку передал(а) коллегам. Если нужно, могу помочь с уточнениями.",
      );
      return;
    }

    if (c.state === "DONE") {
      if (!userTextForFlow) {
        await send("Я на связи. Могу помочь с уточнениями по вашей заявке.");
        return;
      }
      const wantsNewRequest =
        /(нов\w+\s+заявк|ещ[её]\s+заявк|другой\s+вопрос|новый\s+запрос)/i.test(
          userTextForFlow,
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
    if (c.state === "CONSENT_DECLINED") {
      await send(
        "Если захотите вернуться к диалогу, отправьте /start и подтвердите согласие на обработку данных.",
      );
      return;
    }
  }

  private billingCompanyForMultimodal(
    bot: BotConnection,
    ctx: Record<string, unknown>,
    c: Conversation,
  ): string | null {
    if (this.isSharedBot(bot)) {
      const id = String((ctx.targetCompanyId as string) || c.companyId || "");
      if (!id || id === "__shared__") return null;
      return id;
    }
    if (!bot.companyId || bot.companyId === "__shared__") return null;
    return bot.companyId;
  }

  private async downloadTelegramFile(
    bot: BotConnection,
    fileId: string,
  ): Promise<Buffer | null> {
    try {
      const token = this.encryption.decrypt(bot.tokenEncrypted);
      const meta = await axios.get<{
        result?: { file_path?: string; file_size?: number };
      }>(`https://api.telegram.org/bot${token}/getFile`, {
        params: { file_id: fileId },
      });
      const fp = meta.data?.result?.file_path;
      const sz = meta.data?.result?.file_size;
      if (!fp) return null;
      if (sz != null && sz > MAX_TG_DOWNLOAD_BYTES) return null;
      const url = `https://api.telegram.org/file/bot${token}/${fp}`;
      const file = await axios.get(url, {
        responseType: "arraybuffer",
        maxContentLength: MAX_TG_DOWNLOAD_BYTES,
        maxBodyLength: MAX_TG_DOWNLOAD_BYTES,
      });
      return Buffer.from(file.data as ArrayBuffer);
    } catch (e) {
      logError(this.log, "telegram_download_file_failed", {
        botId: bot.id,
        message: e instanceof Error ? e.message : "download_error",
      });
      return null;
    }
  }

  private async audioBufferToWavBase64(buf: Buffer): Promise<string | null> {
    const id = randomUUID();
    const inPath = join(tmpdir(), `tg-a-${id}.bin`);
    const outPath = join(tmpdir(), `tg-a-${id}.wav`);
    try {
      await writeFile(inPath, buf);
      await execFileAsync(
        "ffmpeg",
        ["-y", "-i", inPath, "-ar", "16000", "-ac", "1", "-f", "wav", outPath],
        { timeout: 120_000 },
      );
      const wav = await readFile(outPath);
      return wav.toString("base64");
    } catch (e) {
      logError(this.log, "telegram_ffmpeg_voice_failed", {
        message: e instanceof Error ? e.message : "ffmpeg_error",
      });
      return null;
    } finally {
      await unlink(inPath).catch(() => undefined);
      await unlink(outPath).catch(() => undefined);
    }
  }

  private async extractPdfPlainText(buf: Buffer): Promise<string> {
    try {
      const mod = await import("pdf-parse");
      const pdfParse = mod.default as (b: Buffer) => Promise<{ text?: string }>;
      const res = await pdfParse(buf);
      return String(res?.text || "").trim();
    } catch {
      return "";
    }
  }

  /**
   * Собирает текст пользователя: подпись + текст + (на Business/Pro) смысл голоса, фото, PDF.
   * На Basic голос/фото/PDF не обрабатываются и клиенту не объясняют про тариф — только текст/подпись.
   * Возвращает null, если уже отправлено служебное сообщение и обработку стоит прервать.
   */
  private async resolveTelegramMultimodalUserText(
    bot: BotConnection,
    userMsg: Record<string, unknown>,
    rawText: string,
    caption: string,
    c: Conversation,
    ctx: Record<string, unknown>,
    send: (t: string) => Promise<void>,
  ): Promise<string | null> {
    const base = [rawText, caption].filter(Boolean).join("\n").trim();
    if (rawText.startsWith("/start")) return base;

    const voice = userMsg.voice as
      | { file_id?: string; file_size?: number }
      | undefined;
    const audio = userMsg.audio as
      | { file_id?: string; file_size?: number; mime_type?: string }
      | undefined;
    const photos = userMsg.photo as
      | Array<{ file_id?: string; file_size?: number }>
      | undefined;
    const doc = userMsg.document as
      | {
          file_id?: string;
          file_name?: string;
          mime_type?: string;
          file_size?: number;
        }
      | undefined;

    const voiceId = voice?.file_id;
    const audioId =
      !voiceId && audio?.file_id && (audio.file_size ?? 0) <= 12 * 1024 * 1024
        ? audio.file_id
        : undefined;
    const audioFileId = voiceId || audioId;
    const largestPhoto = Array.isArray(photos)
      ? photos.reduce(
          (best, cur) =>
            (cur.file_size ?? 0) > (best?.file_size ?? 0) ? cur : best,
          undefined as { file_id?: string; file_size?: number } | undefined,
        )
      : undefined;
    const photoId = largestPhoto?.file_id;
    const docMime = String(doc?.mime_type || "").toLowerCase();
    const docName = String(doc?.file_name || "").toLowerCase();
    const docKind = classifyTelegramDocument({
      mimeType: docMime,
      fileName: docName,
      fileSize: doc?.file_size,
      maxBytes: MAX_TG_DOWNLOAD_BYTES,
    });
    const docId =
      doc?.file_id && (docKind === "pdf" || docKind === "image")
        ? doc.file_id
        : undefined;
    const unsupportedDoc =
      doc?.file_id && (docKind === "unsupported" || docKind === "too_large")
        ? doc.file_id
        : undefined;

    if (!audioFileId && !photoId && !docId && !unsupportedDoc) {
      return base;
    }

    const companyId = this.billingCompanyForMultimodal(bot, ctx, c);
    if (!companyId) {
      await send(
        "Сначала выберите компанию (или начните с /start), чтобы я мог обработать вложение.",
      );
      return null;
    }

    const multimodalAllowed =
      await this.billing.supportsMultimodalTelegram(companyId);
    if (!multimodalAllowed) {
      return base;
    }

    if (!this.timewebAi.isEnabled()) {
      return base;
    }

    if (unsupportedDoc) {
      if (docKind === "too_large") {
        await send(
          "Файл слишком большой. Отправьте PDF/изображение до 18 МБ или опишите запрос текстом.",
        );
        return null;
      }
      await send(
        "Пока умею разбирать PDF, JPG, PNG и WEBP. Пришлите в таком формате или опишите текстом.",
      );
      return null;
    }

    const pieces: string[] = [];
    if (base) pieces.push(base);

    if (audioFileId) {
      const buf = await this.downloadTelegramFile(bot, audioFileId);
      if (!buf) {
        await send("Не удалось скачать аудио. Попробуйте ещё раз.");
        return null;
      }
      const wavB64 = await this.audioBufferToWavBase64(buf);
      if (!wavB64) {
        await send(
          "Не удалось подготовить аудио к распознаванию. Напишите текстом или попробуйте позже.",
        );
        return null;
      }
      const tr = await this.timewebAi.interpretVoiceWavBase64(wavB64);
      if (tr) pieces.push(`[Голос] ${tr}`);
    }

    if (photoId) {
      const buf = await this.downloadTelegramFile(bot, photoId);
      if (!buf) {
        await send("Не удалось скачать фото.");
        return null;
      }
      const hint = caption || rawText || "";
      const desc = await this.timewebAi.interpretImageBuffer(
        buf,
        "image/jpeg",
        hint,
      );
      if (desc) pieces.push(`[Фото] ${desc}`);
    }

    if (docId && docKind === "pdf") {
      const buf = await this.downloadTelegramFile(bot, docId);
      if (!buf) {
        await send("Не удалось скачать PDF.");
        return null;
      }
      const extracted = await this.extractPdfPlainText(buf);
      if (!extracted) {
        await send(
          "В PDF не удалось извлечь текст (возможно, скан). Опишите суть текстом.",
        );
        return null;
      }
      const hint = caption || rawText || "";
      const summary = await this.timewebAi.summarizePdfExtract(extracted, hint);
      if (summary) pieces.push(`[PDF] ${summary}`);
    } else if (docId && docKind === "image") {
      const buf = await this.downloadTelegramFile(bot, docId);
      if (!buf) {
        await send("Не удалось скачать файл.");
        return null;
      }
      const hint = caption || rawText || "";
      const mime =
        docMime === "image/png" || docMime === "image/webp"
          ? docMime
          : "image/jpeg";
      const desc = await this.timewebAi.interpretImageBuffer(buf, mime, hint);
      if (desc) pieces.push(`[Файл] ${desc}`);
    }

    const merged = pieces.join("\n\n").trim();
    if (!merged) {
      await send("Не получилось распознать содержимое. Напишите текстом.");
      return null;
    }
    return merged;
  }

  private async sendChatMessage(
    bot: BotConnection,
    chatId: number,
    text: string,
    replyMarkup?: Record<string, unknown>,
  ): Promise<boolean> {
    const safeText = String(text || "").trim();
    if (!safeText) return false;
    // Never allow internal operational alerts to leak to end-users.
    if (/^\[(telegram delivery failed|escalation)\]/i.test(safeText)) {
      logWarn(this.log, "telegram_blocked_internal_text_to_client", {
        botId: bot.id,
        chatId,
      });
      return false;
    }
    try {
      const token = this.encryption.decrypt(bot.tokenEncrypted);
      await axios.post(`https://api.telegram.org/bot${token}/sendChatAction`, {
        chat_id: chatId,
        action: "typing",
      });
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
        chat_id: chatId,
        text: safeText,
        ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
      });
      return true;
    } catch (e) {
      const ax = axios.isAxiosError(e) ? e : null;
      const data = (ax?.response?.data || {}) as {
        description?: string;
        error_code?: number;
        parameters?: { retry_after?: number };
      };
      const message = String(
        ax?.message ||
          (e instanceof Error ? e.message : "telegram_send_error") ||
          "telegram_send_error",
      );
      const code = String((ax?.code as string) || "");
      const stack =
        e instanceof Error && e.stack
          ? e.stack.split("\n").slice(0, 4).join(" | ")
          : "";
      logError(this.log, "telegram_send_message_failed", {
        botId: bot.id,
        chatId,
        message,
        code,
        status: ax?.response?.status || null,
        errorCode: data.error_code || null,
        description: data.description || null,
        retryAfter: data.parameters?.retry_after || null,
        stack,
      });
      const adminChatId = this.adminTelegram.configuredChatId();
      if (adminChatId && String(chatId) === adminChatId) {
        logWarn(this.log, "telegram_admin_alert_target_matches_client_chat", {
          botId: bot.id,
          chatId,
        });
        return false;
      }
      await this.adminTelegram.notify(
        `[Telegram delivery failed] bot=${bot.id}, chat=${chatId}, status=${String(ax?.response?.status || "")}, error=${String(data.description || message || "send_failed")}, code=${code}`,
      );
      return false;
    }
  }
}
