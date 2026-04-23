import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  BillingPayment,
  Company,
  Plan,
  Subscription,
  User,
  UsageCounter,
} from "../../database/entities";
import { BillingController } from "./billing.controller";
import { BillingYooKassaController } from "./billing-yookassa.controller";
import { BillingService } from "./billing.service";
import { YooKassaService } from "./yookassa.service";
import { MailerService } from "../../common/mailer.service";
import { AdminTelegramService } from "../../common/admin-telegram.service";
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Plan,
      Subscription,
      UsageCounter,
      BillingPayment,
      Company,
      User,
    ]),
  ],
  controllers: [BillingController, BillingYooKassaController],
  providers: [
    BillingService,
    YooKassaService,
    MailerService,
    AdminTelegramService,
  ],
  exports: [BillingService],
})
export class BillingModule {}
