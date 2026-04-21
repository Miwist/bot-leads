import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Plan, Subscription, UsageCounter } from "../../database/entities";
import { BillingController } from "./billing.controller";
import { BillingService } from "./billing.service";
@Module({
  imports: [TypeOrmModule.forFeature([Plan, Subscription, UsageCounter])],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
