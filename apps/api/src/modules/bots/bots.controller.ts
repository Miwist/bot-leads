import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { BotsService } from "./bots.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";

@ApiTags("Боты Telegram")
@ApiBearerAuth("JWT")
@Controller("bots")
@UseGuards(JwtAuthGuard)
export class BotsController {
  constructor(private s: BotsService) {}

  @Post("connect")
  @ApiOperation({
    summary: "Подключить бота по токену",
    description:
      "Проверка токена через Telegram, сохранение `webhookSecret`. В режиме **webhook** (прод) после сохранения вызывается Telegram `setWebhook` на публичный URL. В режиме **polling** (Docker dev) запускается long polling через Grammy.",
  })
  connect(
    @Body() b: { companyId: string; token: string; webhookSecret: string },
  ) {
    return this.s.connect(b.companyId, b.token, b.webhookSecret);
  }

  @Get()
  @ApiOperation({
    summary: "Список ботов",
    description: "Query-параметр `companyId`",
  })
  list(@Query("companyId") companyId: string) {
    return this.s.list(companyId);
  }

  @Get("start-link")
  @ApiOperation({
    summary: "Стартовая ссылка для клиентов",
    description: "Query-параметр `companyId`",
  })
  startLink(@Query("companyId") companyId: string) {
    return this.s.getStartLink(companyId);
  }

  @Patch(":id/deactivate")
  @ApiOperation({ summary: "Деактивировать бота" })
  deactivate(@Param("id") id: string) {
    return this.s.deactivate(id);
  }
}
