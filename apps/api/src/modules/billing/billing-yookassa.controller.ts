import { Body, Controller, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { BillingService } from "./billing.service";

@ApiTags("Биллинг")
@Controller("billing/yookassa")
export class BillingYooKassaController {
  constructor(private readonly billing: BillingService) {}

  @Post("notification")
  @ApiOperation({
    summary: "Уведомление ЮKassa (webhook)",
    description:
      "Публичный endpoint. В продакшене ограничьте доступ по IP ЮKassa и/или проверяйте подпись.",
  })
  async notification(@Body() body: Record<string, unknown>) {
    return this.billing.handleYooKassaNotification(body);
  }
}
