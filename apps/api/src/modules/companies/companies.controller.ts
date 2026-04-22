import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CompaniesService } from "./companies.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";

@ApiTags("Компании")
@ApiBearerAuth("JWT")
@Controller("companies")
@UseGuards(JwtAuthGuard)
export class CompaniesController {
  constructor(private s: CompaniesService) {}

  @Post()
  @ApiOperation({ summary: "Создать компанию" })
  create(
    @Body() b: Record<string, unknown>,
    @Req() req: { user: { sub: string; companyId?: string | null; role?: string } },
  ) {
    if (req.user.role === "manager") {
      throw new ForbiddenException("Менеджер не может создавать компанию");
    }
    return this.s.create(req.user.sub, b);
  }

  @Get()
  @ApiOperation({ summary: "Список компаний текущего пользователя" })
  list(
    @Req() req: { user: { sub: string; companyId?: string | null; role?: string } },
  ) {
    return this.s.list(req.user);
  }

  @Get(":id")
  @ApiOperation({ summary: "Получить компанию" })
  get(
    @Param("id") id: string,
    @Req() req: { user: { companyId?: string | null; role?: string } },
  ) {
    return this.s.get(id, req.user);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Обновить компанию" })
  update(
    @Param("id") id: string,
    @Body() b: Record<string, unknown>,
    @Req() req: { user: { companyId?: string | null; role?: string } },
  ) {
    return this.s.update(id, b, req.user);
  }

  @Delete(":id/bot-materials/:materialId")
  @ApiOperation({ summary: "Удалить материал бота (включая файл в S3)" })
  removeBotMaterial(
    @Param("id") id: string,
    @Param("materialId") materialId: string,
    @Req() req: { user: { companyId?: string | null; role?: string } },
  ) {
    return this.s.removeBotMaterial(id, materialId, req.user);
  }
}
