import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import { logError, logWarn } from "./logging";

@Injectable()
export class AdminTelegramService {
  private readonly log = new Logger(AdminTelegramService.name);
  private warned = false;

  constructor(private readonly config: ConfigService) {}

  private settings() {
    const token = this.config.get<string>("GLOBAL_BOT_TOKEN")?.trim() || "";
    const chatId =
      this.config.get<string>("ADMIN_TELEGRAM_CHAT_ID")?.trim() || "";
    return { token, chatId };
  }

  configuredChatId(): string {
    return this.settings().chatId;
  }

  async notify(text: string) {
    const { token, chatId } = this.settings();
    if (!token || !chatId) {
      if (!this.warned) {
        this.warned = true;
        logWarn(this.log, "admin_telegram_not_configured");
      }
      return;
    }
    try {
      await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
        chat_id: chatId,
        text,
      });
    } catch (e) {
      const ax = axios.isAxiosError(e) ? e : null;
      const data = (ax?.response?.data || {}) as {
        description?: string;
        error_code?: number;
        parameters?: { retry_after?: number };
      };
      logError(this.log, "admin_telegram_notify_failed", {
        status: ax?.response?.status || null,
        errorCode: data.error_code || null,
        description: data.description || null,
        retryAfter: data.parameters?.retry_after || null,
        message: String(
          ax?.message ||
            (e instanceof Error ? e.message : "request_failed") ||
            "request_failed",
        ),
        code: String((ax?.code as string) || ""),
      });
    }
  }
}
