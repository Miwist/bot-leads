import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
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
  create(@Body() b: Record<string, unknown>) {
    return this.s.create(b);
  }

  @Get()
  @ApiOperation({ summary: "Список компаний текущего пользователя" })
  list() {
    return this.s.list();
  }

  @Get(":id")
  @ApiOperation({ summary: "Получить компанию" })
  get(@Param("id") id: string) {
    return this.s.get(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Обновить компанию" })
  update(@Param("id") id: string, @Body() b: Record<string, unknown>) {
    return this.s.update(id, b);
  }
}
