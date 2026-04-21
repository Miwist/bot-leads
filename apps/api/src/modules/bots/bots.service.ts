import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import axios from "axios";
import { BotConnection } from "../../database/entities";
import { EncryptionService } from "../../common/encryption.service";
import {
  TELEGRAM_BOT_BEFORE_DEACTIVATE_EVENT,
  TELEGRAM_BOT_CONNECTED_EVENT,
} from "../../common/telegram-lifecycle.events";

@Injectable()
export class BotsService {
  constructor(
    @InjectRepository(BotConnection) private repo: Repository<BotConnection>,
    private enc: EncryptionService,
    private readonly events: EventEmitter2,
  ) {}

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
}
