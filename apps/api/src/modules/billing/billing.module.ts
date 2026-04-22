import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  BillingPayment,
  Company,
  Plan,
  Subscription,
  UsageCounter,
} from "../../database/entities";
import { BillingController } from "./billing.controller";
import { BillingYooKassaController } from "./billing-yookassa.controller";
import { BillingService } from "./billing.service";
import { YooKassaService } from "./yookassa.service";
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Plan,
      Subscription,
      UsageCounter,
      BillingPayment,
      Company,
    ]),
  ],
  controllers: [BillingController, BillingYooKassaController],
  providers: [BillingService, YooKassaService],
  exports: [BillingService],
})
export class BillingModule {}
