import { Controller, Get, Query, UseGuards } from "@nestjs/common";
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
  list(@Query("companyId") companyId: string) {
    return this.service.list(companyId);
  }
}
