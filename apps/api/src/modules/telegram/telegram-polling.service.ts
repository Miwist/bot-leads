import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Bot } from "grammy";
import { BotConnection } from "../../database/entities";
import { EncryptionService } from "../../common/encryption.service";
import { BotsService } from "../bots/bots.service";
import { TelegramService } from "./telegram.service";

@Injectable()
export class TelegramPollingService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly log = new Logger(TelegramPollingService.name);
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

  async onApplicationBootstrap() {
    if (this.updatesMode() !== "polling") return;
    await this.bots.ensureGlobalBotFromEnv();
    const list = await this.bots.findAllActive();
    this.log.log(`Режим polling: запуск для ${list.length} ботов`);
    for (const b of list) {
      await this.register(b);
    }
  }

  async register(bot: BotConnection) {
    if (this.updatesMode() !== "polling") return;
    await this.unregister(bot.id);
    const token = this.encryption.decrypt(bot.tokenEncrypted);
    const gBot = new Bot(token);
    gBot.use(async (ctx) => {
      await this.telegram.dispatchUpdate(bot, ctx.update);
    });
    gBot.catch((err) => this.log.error(`Grammy error (бот ${bot.id})`, err));
    this.runners.set(bot.id, gBot);
    void gBot.start().catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      // Grammy throws "Aborted delay" when polling is intentionally stopped.
      if (msg.includes("Aborted delay")) {
        this.log.warn(`Polling для бота ${bot.id} остановлен`);
        return;
      }
      this.log.error(`Polling завершился ошибкой (бот ${bot.id})`, err);
    });
    this.log.log(`Polling запущен для @${bot.botUsername} (${bot.id})`);
  }

  async unregister(id: string) {
    const gBot = this.runners.get(id);
    if (!gBot) return;
    await gBot.stop();
    this.runners.delete(id);
    this.log.log(`Polling остановлен для бота ${id}`);
  }

  async onApplicationShutdown() {
    for (const id of [...this.runners.keys()]) {
      await this.unregister(id);
    }
  }
}
