import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { BillingService } from "./billing.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";

@ApiTags("Биллинг")
@ApiBearerAuth("JWT")
@Controller("billing")
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(private s: BillingService) {}

  @Get("current")
  @ApiOperation({
    summary: "Текущий тариф и лимиты",
    description: "Query-параметр `companyId`",
  })
  current(@Query("companyId") companyId: string) {
    return this.s.current(companyId);
  }

  @Get("payment-status")
  @ApiOperation({
    summary: "Проверка статуса конкретного платежа",
    description: "Query-параметры: `companyId`, `paymentId`",
  })
  paymentStatus(
    @Query("companyId") companyId: string,
    @Query("paymentId") paymentId: string,
  ) {
    return this.s.paymentStatus(companyId, paymentId);
  }

  @Post("checkout")
  @ApiOperation({
    summary: "Создать платёж в ЮKassa и получить ссылку на оплату",
    description:
      "Либо `planCode` + `months`, либо только `amountRub` (без смены тарифа).",
  })
  checkout(
    @Body()
    body: {
      companyId: string;
      planCode?: string;
      months?: number;
      amountRub?: number;
    },
  ) {
    return this.s.createCheckout(body);
  }
}
