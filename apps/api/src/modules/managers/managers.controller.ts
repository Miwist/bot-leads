import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ManagersService } from "./managers.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";

@ApiTags("Менеджеры")
@ApiBearerAuth("JWT")
@Controller("managers")
@UseGuards(JwtAuthGuard)
export class ManagersController {
  constructor(private s: ManagersService) {}

  @Post()
  @ApiOperation({ summary: "Создать менеджера" })
  create(@Body() b: Record<string, unknown>) {
    return this.s.create(b);
  }

  @Get()
  @ApiOperation({
    summary: "Список менеджеров",
    description: "Обязательный query-параметр `companyId`",
  })
  list(@Query("companyId") companyId: string) {
    return this.s.list(companyId);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Обновить менеджера" })
  update(@Param("id") id: string, @Body() b: Record<string, unknown>) {
    return this.s.update(id, b);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Удалить менеджера" })
  remove(@Param("id") id: string) {
    return this.s.delete(id);
  }
}
