import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { ConfigService } from "@nestjs/config";
import { BotConnection } from "../../database/entities";
import {
  TELEGRAM_BOT_BEFORE_DEACTIVATE_EVENT,
  TELEGRAM_BOT_CONNECTED_EVENT,
} from "../../common/telegram-lifecycle.events";
import { TelegramWebhookService } from "./telegram-webhook.service";
import { TelegramPollingService } from "./telegram-polling.service";

@Injectable()
export class TelegramTransportListener {
  private readonly log = new Logger(TelegramTransportListener.name);

  constructor(
    private readonly config: ConfigService,
    private readonly webhook: TelegramWebhookService,
    private readonly polling: TelegramPollingService,
  ) {}

  private updatesMode(): string {
    return (
      this.config.get<string>("TELEGRAM_UPDATES_MODE") ?? "webhook"
    ).toLowerCase();
  }

  @OnEvent(TELEGRAM_BOT_CONNECTED_EVENT)
  async onBotConnected(bot: BotConnection) {
    try {
      if (this.updatesMode() === "polling") await this.polling.register(bot);
      else await this.webhook.setForBot(bot);
    } catch (e) {
      this.log.error(
        `Не удалось применить транспорт для нового бота ${bot.id}`,
        e,
      );
    }
  }

  @OnEvent(TELEGRAM_BOT_BEFORE_DEACTIVATE_EVENT)
  async onBeforeDeactivate(bot: BotConnection) {
    try {
      if (this.updatesMode() === "polling") await this.polling.unregister(bot.id);
      else await this.webhook.deleteForBot(bot);
    } catch (e) {
      this.log.error(`Не удалось отписать бота ${bot.id}`, e);
    }
  }
}
