import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import { BotConnection } from "../../database/entities";
import { EncryptionService } from "../../common/encryption.service";
import { BotsService } from "../bots/bots.service";

@Injectable()
export class TelegramWebhookService implements OnApplicationBootstrap {
  private readonly log = new Logger(TelegramWebhookService.name);
  private static readonly SHARED_COMPANY_ID = "__shared__";

  constructor(
    private readonly config: ConfigService,
    private readonly bots: BotsService,
    private readonly encryption: EncryptionService,
  ) {}

  private updatesMode(): string {
    return (
      this.config.get<string>("TELEGRAM_UPDATES_MODE") ?? "webhook"
    ).toLowerCase();
  }

  private webhookBaseUrl(): string | undefined {
    const raw = this.config.get<string>("TELEGRAM_WEBHOOK_BASE_URL")?.trim();
    return raw?.replace(/\/$/, "") || undefined;
  }

  async onApplicationBootstrap() {
    if (this.updatesMode() !== "webhook") return;
    const base = this.webhookBaseUrl();
    if (!base) {
      this.log.warn(
        "TELEGRAM_WEBHOOK_BASE_URL не задан — пропускаю синхронизацию webhook при старте",
      );
      return;
    }
    await this.bots.ensureGlobalBotFromEnv({ emitLifecycleEvent: false });
    const list = await this.bots.findAllActive();
    this.log.log(
      `Режим webhook: подписываю ${list.length} активных ботов на ${base}/telegram/webhook`,
    );
    for (const bot of list) {
      if (bot.companyId === TelegramWebhookService.SHARED_COMPANY_ID) continue;
      try {
        await this.setForBot(bot);
      } catch (e) {
        this.log.error(`setWebhook не удался для бота ${bot.id}`, e);
      }
    }
  }

  async setForBot(bot: BotConnection) {
    if (bot.companyId === TelegramWebhookService.SHARED_COMPANY_ID) {
      this.log.log(
        `Общий бот @${bot.botUsername} (${bot.id}) обслуживается только через polling`,
      );
      return;
    }
    const base = this.webhookBaseUrl();
    if (!base) {
      this.log.warn(
        "TELEGRAM_WEBHOOK_BASE_URL не задан — setWebhook пропущен (нужен публичный HTTPS URL)",
      );
      return;
    }
    const token = this.encryption.decrypt(bot.tokenEncrypted);
    const url = `${base}/telegram/webhook`;
    await axios.post(`https://api.telegram.org/bot${token}/setWebhook`, {
      url,
      secret_token: bot.webhookSecret,
      allowed_updates: ["message"],
    });
    this.log.log(`Webhook установлен для @${bot.botUsername} (${bot.id})`);
  }

  async deleteForBot(bot: BotConnection) {
    const token = this.encryption.decrypt(bot.tokenEncrypted);
    await axios.post(`https://api.telegram.org/bot${token}/deleteWebhook`, {
      drop_pending_updates: false,
    });
    this.log.log(`Webhook снят для бота ${bot.id}`);
  }
}
