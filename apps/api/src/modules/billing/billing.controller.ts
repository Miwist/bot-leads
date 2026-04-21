import { Body, Controller, Get, Patch, Query, UseGuards } from "@nestjs/common";
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

  @Patch("subscription")
  @ApiOperation({ summary: "Сменить тариф компании" })
  changePlan(@Body() body: { companyId: string; planCode: string }) {
    return this.s.changePlan(body.companyId, body.planCode);
  }
}
