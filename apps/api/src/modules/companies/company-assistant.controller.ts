import {
  BadRequestException,
  Body,
  Controller,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { CompaniesService } from "./companies.service";
import { TimewebAiService } from "../ai/timeweb-ai.service";

@ApiTags("Компании")
@ApiBearerAuth("JWT")
@Controller("companies")
@UseGuards(JwtAuthGuard)
export class CompanyAssistantController {
  constructor(
    private readonly companies: CompaniesService,
    private readonly timeweb: TimewebAiService,
  ) {}

  @Post(":id/assistant/generate-welcome")
  @ApiOperation({
    summary: "Сгенерировать приветствие (ИИ)",
    description:
      "Требуется настроенный на сервере Timeweb Cloud AI; иначе 400.",
  })
  async generateWelcome(
    @Param("id") id: string,
    @Req()
    req: { user: { sub?: string; companyId?: string | null; role?: string } },
    @Body()
    body: {
      companyName?: string;
      description?: string | null;
      botObjective?: string | null;
      communicationTone?: string | null;
    },
  ) {
    const row = await this.companies.get(id, req.user);
    if (!row) throw new NotFoundException();
    if (!this.timeweb.isEnabled()) {
      throw new BadRequestException(
        "Генерация через ИИ сейчас недоступна. Введите текст вручную или попробуйте позже.",
      );
    }
    const text = await this.timeweb.generateWelcomeMessage({
      companyName:
        String(body.companyName || row.name || "").trim() || "Компания",
      description: body.description ?? row.description,
      botObjective: body.botObjective ?? row.botObjective,
      communicationTone: body.communicationTone ?? row.communicationTone,
    });
    if (!text) {
      throw new BadRequestException(
        "Не удалось сгенерировать текст. Попробуйте ещё раз.",
      );
    }
    return { text };
  }

  @Post(":id/assistant/refine-text")
  @ApiOperation({
    summary: "Улучшить текст с помощью ИИ",
    description:
      "Тело: text (обязательно), опционально userHint, communicationTone, assistantInstruction.",
  })
  async refineText(
    @Param("id") id: string,
    @Req()
    req: { user: { sub?: string; companyId?: string | null; role?: string } },
    @Body()
    body: {
      text: string;
      userHint?: string | null;
      communicationTone?: string | null;
      assistantInstruction?: string | null;
    },
  ) {
    const row0 = await this.companies.get(id, req.user);
    if (!row0) throw new NotFoundException();
    if (!this.timeweb.isEnabled()) {
      throw new BadRequestException(
        "Редактирование через ИИ сейчас недоступно. Измените текст вручную или попробуйте позже.",
      );
    }
    const row = row0;
    const text = await this.timeweb.refineAssistantText({
      text: String(body.text || ""),
      userHint: body.userHint,
      communicationTone: body.communicationTone ?? row?.communicationTone,
      assistantInstruction:
        body.assistantInstruction ?? row?.assistantInstruction,
    });
    if (!text) {
      throw new BadRequestException(
        "Не удалось отредактировать текст. Попробуйте ещё раз.",
      );
    }
    return { text };
  }
}
