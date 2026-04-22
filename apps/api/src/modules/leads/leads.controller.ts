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

@ApiTags("Лиды")
@ApiBearerAuth("JWT")
@Controller("leads")
@UseGuards(JwtAuthGuard)
export class LeadsController {
  constructor(private s: LeadsService) {}

  @Get()
  @ApiOperation({
    summary: "Список лидов",
    description: "Query: `companyId`, опционально `status` (код статуса)",
  })
  list(@Query("companyId") companyId: string, @Query("status") status?: string) {
    return this.s.list(companyId, status);
  }

  @Get("stats/:companyId")
  @ApiOperation({ summary: "Сводка по лидам компании" })
  stats(@Param("companyId") companyId: string) {
    return this.s.stats(companyId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Лид по id" })
  get(@Param("id") id: string) {
    return this.s.get(id);
  }

  @Patch(":id/status")
  @ApiOperation({ summary: "Обновить статус лида" })
  update(@Param("id") id: string, @Body() b: { status: string }) {
    return this.s.updateStatus(id, b.status);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Обновить поля лида" })
  updateLead(@Param("id") id: string, @Body() b: Record<string, unknown>) {
    return this.s.update(id, b as never);
  }

  @Post(":id/assign-now")
  @ApiOperation({ summary: "Назначить менеджера сейчас (round-robin)" })
  assign(@Param("id") id: string) {
    return this.s.assignNow(id);
  }
}
