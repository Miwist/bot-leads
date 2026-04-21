import { Body, Controller, Headers, Post } from "@nestjs/common";
import { ApiBody, ApiOperation, ApiSecurity, ApiTags } from "@nestjs/swagger";
import { TelegramService } from "./telegram.service";

@ApiTags("Telegram")
@Controller("telegram")
export class TelegramController {
  constructor(private s: TelegramService) {}

  @Post("webhook")
  @ApiSecurity("telegram-webhook")
  @ApiOperation({
    summary: "Входящий webhook от Telegram",
    description:
      "Вызывается Telegram; секрет в заголовке должен совпадать с сохранённым при подключении бота.",
  })
  @ApiBody({ description: "Объект Update Telegram Bot API" })
  async hook(
    @Headers("x-telegram-bot-api-secret-token") secret: string,
    @Body() update: Record<string, unknown>,
  ) {
    return this.s.handleWebhookSecret(secret, update);
  }
}
