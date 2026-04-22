import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import axios from "axios";
import { BotConnection, Company } from "../../database/entities";
import { EncryptionService } from "../../common/encryption.service";
import {
  TELEGRAM_BOT_BEFORE_DEACTIVATE_EVENT,
  TELEGRAM_BOT_CONNECTED_EVENT,
} from "../../common/telegram-lifecycle.events";

@Injectable()
export class BotsService {
  private readonly log = new Logger(BotsService.name);

  constructor(
    @InjectRepository(BotConnection) private repo: Repository<BotConnection>,
    @InjectRepository(Company) private companies: Repository<Company>,
    private enc: EncryptionService,
    private readonly events: EventEmitter2,
    private readonly config: ConfigService,
  ) {}

  /**
   * Общий бот из env: создаёт/обновляет запись в `bot_connections`, чтобы polling/webhook
   * всегда поднимали его при наличии GLOBAL_BOT_TOKEN.
   */
  async ensureGlobalBotFromEnv(): Promise<{ ok: boolean; reason?: string }> {
    const token = this.config.get<string>("GLOBAL_BOT_TOKEN")?.trim();
    const companyId = "__shared__";
    const secret =
      this.config.get<string>("GLOBAL_BOT_SECRET")?.trim() ||
      "global-secret";
    if (!token) {
      return { ok: false, reason: "no_token" };
    }
    const me = await axios.get<{ result?: { username?: string } }>(
      `https://api.telegram.org/bot${token}/getMe`,
    );
    const botUsername = me.data.result?.username;
    if (!botUsername) {
      this.log.error("GLOBAL_BOT_TOKEN: getMe не вернул username");
      return { ok: false, reason: "no_username" };
    }
    const tokenEncrypted = this.enc.encrypt(token);
    const existing = await this.repo.findOne({
      where: { webhookSecret: secret, companyId: "__shared__" },
    });
    if (existing) {
      await this.repo.update(
        { id: existing.id },
        {
          companyId,
          tokenEncrypted,
          botUsername,
          status: "active",
        },
      );
      const row = await this.repo.findOne({ where: { id: existing.id } });
      if (row) this.events.emit(TELEGRAM_BOT_CONNECTED_EVENT, row);
      this.log.log(`Общий бот обновлён: @${botUsername}`);
      return { ok: true };
    }
    const saved = await this.repo.save(
      this.repo.create({
        companyId,
        tokenEncrypted,
        botUsername,
        status: "active",
        webhookSecret: secret,
      }),
    );
    this.events.emit(TELEGRAM_BOT_CONNECTED_EVENT, saved);
    this.log.log(`Общий бот зарегистрирован: @${botUsername} (${saved.id})`);
    return { ok: true };
  }

  async connect(companyId: string, token: string, webhookSecret: string) {
    const me = await axios.get<{ result?: { username?: string } }>(
      `https://api.telegram.org/bot${token}/getMe`,
    );
    const botUsername = me.data.result?.username;
    if (!botUsername) throw new Error("Telegram getMe: нет username");
    const saved = await this.repo.save(
      this.repo.create({
        companyId,
        tokenEncrypted: this.enc.encrypt(token),
        botUsername,
        status: "active",
        webhookSecret,
      }),
    );
    this.events.emit(TELEGRAM_BOT_CONNECTED_EVENT, saved);
    return { id: saved.id, botUsername };
  }

  list(companyId: string) {
    return this.repo.find({ where: { companyId } });
  }

  findAllActive(): Promise<BotConnection[]> {
    return this.repo.find({ where: { status: "active" } });
  }

  async deactivate(id: string) {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) return { ok: false as const };
    this.events.emit(TELEGRAM_BOT_BEFORE_DEACTIVATE_EVENT, row);
    await this.repo.update({ id }, { status: "inactive" });
    return { ok: true as const };
  }

  findBySecret(secret: string) {
    return this.repo.findOne({
      where: { webhookSecret: secret, status: "active" },
    });
  }

  async getStartLink(companyId: string) {
    const company = await this.companies.findOne({ where: { id: companyId } });
    if (!company) return { link: "", botUsername: "" };
    const custom = await this.repo.findOne({
      where: { companyId, status: "active" },
      order: { createdAt: "DESC" },
    });
    const shared = await this.repo.findOne({
      where: { companyId: "__shared__", status: "active" },
      order: { createdAt: "DESC" },
    });
    const selected = company.botMode === "custom" ? custom || shared : shared;
    const botUsername = selected?.botUsername || "";
    if (!botUsername) return { link: "", botUsername: "" };
    return {
      botUsername,
      link: `https://t.me/${botUsername}?start=%3F%3D${companyId}`,
    };
  }
}
