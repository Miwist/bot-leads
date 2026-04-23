import { Controller, Get, Res } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { metricsRegistry } from "../../common/metrics";

@ApiTags("Служебное")
@Controller()
export class HealthController {
  @Get("health")
  @ApiOperation({ summary: "Проверка живости сервиса" })
  get() {
    return { status: "ok" };
  }

  @Get("metrics")
  @ApiOperation({ summary: "Prometheus-метрики сервиса" })
  async metrics(@Res() response: Response): Promise<void> {
    response.setHeader("Content-Type", metricsRegistry.contentType);
    response.send(await metricsRegistry.metrics());
  }
}
