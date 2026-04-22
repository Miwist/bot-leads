import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Manager } from "../../database/entities";
import { ManagersService, JwtActor } from "./managers.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";

@ApiTags("Менеджеры")
@ApiBearerAuth("JWT")
@Controller("managers")
@UseGuards(JwtAuthGuard)
export class ManagersController {
  constructor(private s: ManagersService) {}

  @Post()
  @ApiOperation({ summary: "Создать менеджера" })
  create(@Body() b: Record<string, unknown>, @Req() req: { user: JwtActor }) {
    return this.s.create(
      b as Partial<Manager> & { password?: string },
      req.user,
    );
  }

  @Get()
  @ApiOperation({
    summary: "Список менеджеров",
    description: "Обязательный query-параметр `companyId`",
  })
  list(@Query("companyId") companyId: string, @Req() req: { user: JwtActor }) {
    return this.s.list(companyId, req.user);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Обновить менеджера" })
  update(
    @Param("id") id: string,
    @Body() b: Record<string, unknown>,
    @Req() req: { user: JwtActor },
  ) {
    return this.s.update(id, b as Partial<Manager>, req.user);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Удалить менеджера" })
  remove(@Param("id") id: string, @Req() req: { user: JwtActor }) {
    return this.s.delete(id, req.user);
  }
}
