import { Body, Controller, Get, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { FeedbackService } from "./feedback.service";

@ApiTags("Обратная связь")
@ApiBearerAuth("JWT")
@UseGuards(JwtAuthGuard)
@Controller("feedback")
export class FeedbackController {
  constructor(private readonly feedback: FeedbackService) {}

  @Get()
  @ApiOperation({ summary: "Лента обратной связи компании" })
  list(
    @Req() req: { user: { role?: string; companyId?: string | null } },
    @Query("companyId") companyId: string,
    @Query("topic") topic?: string,
  ) {
    return this.feedback.listMessages(req.user, companyId, topic);
  }

  @Get("topics")
  @ApiOperation({ summary: "Список тем поддержки компании" })
  topics(
    @Req() req: { user: { role?: string; companyId?: string | null } },
    @Query("companyId") companyId: string,
  ) {
    return this.feedback.listTopics(req.user, companyId);
  }

  @Post()
  @ApiOperation({ summary: "Отправить сообщение от компании" })
  create(
    @Req() req: { user: { sub?: string; role?: string; companyId?: string | null } },
    @Body()
    body: {
      companyId: string;
      text: string;
      topic?: string;
      attachments?: Array<{ name?: string; data?: string }>;
      attachmentName?: string;
      attachmentData?: string;
    },
  ) {
    return this.feedback.createCompanyMessage(req.user, body);
  }

  @Get("admin/threads")
  @ApiOperation({ summary: "Список диалогов для администратора" })
  adminThreads(@Req() req: { user: { role?: string } }) {
    return this.feedback.listAdminThreads(req.user);
  }

  @Post("admin/reply")
  @ApiOperation({ summary: "Ответ администратора компании" })
  adminReply(
    @Req() req: { user: { sub?: string; role?: string } },
    @Body()
    body: {
      companyId: string;
      text: string;
      topic?: string;
      attachments?: Array<{ name?: string; data?: string }>;
      attachmentName?: string;
      attachmentData?: string;
    },
  ) {
    return this.feedback.createAdminReply(req.user, body);
  }
}
