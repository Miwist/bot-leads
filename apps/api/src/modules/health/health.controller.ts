import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

@ApiTags("Служебное")
@Controller("health")
export class HealthController {
  @Get()
  @ApiOperation({ summary: "Проверка живости сервиса" })
  get() {
    return { status: "ok" };
  }
}
