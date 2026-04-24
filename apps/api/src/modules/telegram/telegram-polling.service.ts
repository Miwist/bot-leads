import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Bot } from "grammy";
import axios from "axios";
import { BotConnection } from "../../database/entities";
import { EncryptionService } from "../../common/encryption.service";
import { BotsService } from "../bots/bots.service";
import { TelegramService } from "./telegram.service";

@Injectable()
export class TelegramPollingService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly log = new Logger(TelegramPollingService.name);
  private static readonly SHARED_COMPANY_ID = "__shared__";
  private readonly runners = new Map<string, Bot>();

  constructor(
    private readonly config: ConfigService,
    private readonly bots: BotsService,
    private readonly encryption: EncryptionService,
    private readonly telegram: TelegramService,
  ) {}

  private updatesMode(): string {
    return (
      this.config.get<string>("TELEGRAM_UPDATES_MODE") ?? "webhook"
    ).toLowerCase();
  }

  private sharedBotPollingEnabled(): boolean {
    return (
      String(this.config.get<string>("TELEGRAM_SHARED_BOT_POLLING") ?? "true")
        .trim()
        .toLowerCase() !== "false"
    );
  }

  private shouldUsePolling(bot: Pick<BotConnection, "companyId">): boolean {
    if (
      bot.companyId === TelegramPollingService.SHARED_COMPANY_ID &&
      !this.sharedBotPollingEnabled()
    ) {
      return false;
    }
    return (
      this.updatesMode() === "polling" ||
      bot.companyId === TelegramPollingService.SHARED_COMPANY_ID
    );
  }

  private async dropWebhookBeforePolling(bot: BotConnection, token: string) {
    try {
      await axios.post(`https://api.telegram.org/bot${token}/deleteWebhook`, {
        drop_pending_updates: false,
      });
      this.log.log(`Webhook снят перед polling для бота ${bot.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.log.warn(
        `Не удалось снять webhook перед polling для бота ${bot.id}: ${msg}`,
      );
    }
  }

  private formatPollingError(err: unknown): string {
    if (err instanceof Error) return err.message;
    if (typeof err === "string") return err;
    return "unknown_error";
  }

  async onApplicationBootstrap() {
    await this.bots.ensureGlobalBotFromEnv({ emitLifecycleEvent: false });
    const list = await this.bots.findAllActive();
    const pollingBots = list.filter((bot) => this.shouldUsePolling(bot));
    this.log.log(
      `Polling при старте: запуск для ${pollingBots.length} из ${list.length} активных ботов`,
    );
    for (const b of pollingBots) {
      await this.register(b);
    }
  }

  async register(bot: BotConnection) {
    if (!this.shouldUsePolling(bot)) return;
    await this.unregister(bot.id);
    const token = this.encryption.decrypt(bot.tokenEncrypted);
    await this.dropWebhookBeforePolling(bot, token);
    const gBot = new Bot(token);
    gBot.use(async (ctx) => {
      try {
        await this.telegram.dispatchUpdate(bot, ctx.update);
      } catch (err) {
        this.log.error(
          `Polling update failed (бот ${bot.id}): ${this.formatPollingError(err)}`,
        );
      }
    });
    gBot.catch((err) => {
      this.log.error(
        `Grammy error (бот ${bot.id}): ${this.formatPollingError(err)}`,
      );
    });
    this.runners.set(bot.id, gBot);
    void gBot.start().catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      // Grammy throws "Aborted delay" when polling is intentionally stopped.
      if (msg.includes("Aborted delay")) {
        this.log.warn(`Polling для бота ${bot.id} остановлен`);
        return;
      }
      if (
        msg.includes("terminated by other getUpdates request") ||
        msg.includes("(409:")
      ) {
        this.log.warn(
          `Polling conflict 409 для бота ${bot.id}: другой инстанс уже выполняет getUpdates`,
        );
        this.runners.delete(bot.id);
        return;
      }
      this.log.error(`Polling завершился ошибкой (бот ${bot.id})`, err);
    });
    this.log.log(`Polling запущен для @${bot.botUsername} (${bot.id})`);
  }

  async unregister(id: string) {
    const gBot = this.runners.get(id);
    if (!gBot) return;
    try {
      await gBot.stop();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.log.warn(`Polling stop failed for bot ${id}: ${msg}`);
    }
    this.runners.delete(id);
    this.log.log(`Polling остановлен для бота ${id}`);
  }

  async onApplicationShutdown() {
    for (const id of [...this.runners.keys()]) {
      await this.unregister(id);
    }
  }
}
