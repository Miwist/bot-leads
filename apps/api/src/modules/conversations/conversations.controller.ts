import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { ConversationsService } from "./conversations.service";

@ApiTags("Диалоги")
@ApiBearerAuth("JWT")
@Controller("conversations")
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(private readonly service: ConversationsService) {}

  @Get()
  @ApiOperation({ summary: "Список диалогов компании" })
  list(
    @Req() req: { user: { role?: string; companyId?: string | null } },
    @Query("companyId") companyId: string,
  ) {
    return this.service.list(req.user, companyId);
  }

  @Get(":id/messages")
  @ApiOperation({ summary: "Порционная подгрузка сообщений диалога" })
  messages(
    @Req() req: { user: { role?: string; companyId?: string | null } },
    @Param("id") id: string,
    @Query("companyId") companyId: string,
    @Query("cursor") cursor?: string,
    @Query("limit") limit?: string,
  ) {
    return this.service.messages(req.user, companyId, id, {
      cursor,
      limit: Number(limit || 40),
    });
  }

  @Post("reply")
  @ApiOperation({ summary: "Ответить клиенту в Telegram из кабинета" })
  reply(
    @Req() req: { user: { role?: string; companyId?: string | null } },
    @Body()
    body: {
      companyId: string;
      conversationId: string;
      text: string;
      attachments?: Array<{ name?: string; data?: string }>;
    },
  ) {
    return this.service.reply(
      req.user,
      body.companyId,
      body.conversationId,
      body.text,
      body.attachments || [],
    );
  }

  @Patch(":id/mode")
  @ApiOperation({ summary: "Ручное управление режимом ИИ/менеджера в диалоге" })
  setMode(
    @Req() req: { user: { role?: string; companyId?: string | null } },
    @Param("id") id: string,
    @Body()
    body: {
      companyId: string;
      mode: "assistant" | "manager";
      managerHoldMinutes?: number;
    },
  ) {
    return this.service.setMode(req.user, body.companyId, id, body);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Удалить переписку (диалог) по id" })
  remove(
    @Req() req: { user: { role?: string; companyId?: string | null } },
    @Param("id") id: string,
    @Query("companyId") companyId: string,
  ) {
    return this.service.remove(req.user, companyId, id);
  }
}
