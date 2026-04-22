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
import { LeadsService } from "./leads.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";

@ApiTags("Заявки")
@ApiBearerAuth("JWT")
@Controller("leads")
@UseGuards(JwtAuthGuard)
export class LeadsController {
  constructor(private s: LeadsService) {}

  @Get()
  @ApiOperation({
    summary: "Список заявок",
    description:
      "Query: `companyId`; опционально `status`, `source`, `dateFrom`, `dateTo` (YYYY-MM-DD), `q` (поиск по имени, телефону, запросу, email, комментарию).",
  })
  list(
    @Query("companyId") companyId: string,
    @Query("status") status?: string,
    @Query("source") source?: string,
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
    @Query("q") q?: string,
  ) {
    return this.s.list(companyId, {
      status,
      source,
      dateFrom,
      dateTo,
      q,
    });
  }

  @Get("sources/list")
  @ApiOperation({
    summary: "Уникальные источники заявок компании",
    description: "Query: `companyId`",
  })
  sources(@Query("companyId") companyId: string) {
    return this.s.distinctSources(companyId);
  }

  @Get("stats/:companyId")
  @ApiOperation({ summary: "Сводка по заявкам компании" })
  stats(@Param("companyId") companyId: string) {
    return this.s.stats(companyId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Заявка по id" })
  get(@Param("id") id: string) {
    return this.s.get(id);
  }

  @Patch(":id/status")
  @ApiOperation({ summary: "Обновить статус заявки" })
  update(@Param("id") id: string, @Body() b: { status: string }) {
    return this.s.updateStatus(id, b.status);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Обновить поля заявки" })
  updateLead(@Param("id") id: string, @Body() b: Record<string, unknown>) {
    return this.s.update(id, b as never);
  }

  @Post(":id/assign-now")
  @ApiOperation({ summary: "Назначить менеджера сейчас (round-robin)" })
  assign(@Param("id") id: string) {
    return this.s.assignNow(id);
  }
}
