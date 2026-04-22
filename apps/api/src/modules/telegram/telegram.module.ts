import { Module } from "@nestjs/common";
import { TelegramController } from "./telegram.controller";
import { TelegramService } from "./telegram.service";
import { TelegramWebhookService } from "./telegram-webhook.service";
import { TelegramPollingService } from "./telegram-polling.service";
import { TelegramTransportListener } from "./telegram-transport.listener";
import { BotsModule } from "../bots/bots.module";
import { LeadsModule } from "../leads/leads.module";
import { BillingModule } from "../billing/billing.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  Company,
  Conversation,
  ConversationMessage,
} from "../../database/entities";
import { AiModule } from "../ai/ai.module";
@Module({
  imports: [
    AiModule,
    BotsModule,
    LeadsModule,
    BillingModule,
    TypeOrmModule.forFeature([Conversation, Company, ConversationMessage]),
  ],
  controllers: [TelegramController],
  providers: [
    TelegramService,
    TelegramWebhookService,
    TelegramPollingService,
    TelegramTransportListener,
  ],
})
export class TelegramModule {}
