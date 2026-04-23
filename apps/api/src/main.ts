import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { json, urlencoded } from "express";
import { randomUUID } from "crypto";
import { AppModule } from "./app.module";
import { setupSwagger } from "./swagger";
import { HttpExceptionLoggingFilter } from "./common/http-exception.filter";
import { logInfo } from "./common/logging";
import { httpRequestDurationMs, httpRequestsTotal } from "./common/metrics";

async function bootstrap() {
  const log = new Logger("HttpAccess");
  const app = await NestFactory.create(AppModule);
  const bodyLimit = process.env.API_BODY_LIMIT ?? "150mb";
  app.use(json({ limit: bodyLimit }));
  app.use(urlencoded({ extended: true, limit: bodyLimit }));
  app.use(
    (
      req: Record<string, unknown>,
      res: Record<string, unknown>,
      next: () => void,
    ) => {
      const requestId = String(
        (req.headers as Record<string, unknown>)?.["x-request-id"] ||
          randomUUID(),
      );
      (req as Record<string, unknown>).requestId = requestId;
      (res as { setHeader: (name: string, value: string) => void }).setHeader(
        "x-request-id",
        requestId,
      );
      const startedAt = Date.now();
      const method = String((req as { method?: string }).method || "");
      const path = String(
        (req as { originalUrl?: string; url?: string }).originalUrl ||
          (req as { url?: string }).url ||
          "",
      );
      (res as { on: (event: string, cb: () => void) => void }).on(
        "finish",
        () => {
          const pathWithoutQuery = path.split("?")[0] ?? path;
          const status = Number(
            (res as { statusCode?: number }).statusCode || 0,
          );
          const durationMs = Date.now() - startedAt;
          const labels = {
            method,
            route: pathWithoutQuery,
            status: String(status),
          };
          httpRequestsTotal.inc(labels);
          httpRequestDurationMs.observe(labels, durationMs);

          if (pathWithoutQuery === "/health" || pathWithoutQuery === "/metrics")
            return;
          logInfo(log, "http_access", {
            requestId,
            method,
            path,
            status,
            durationMs,
          });
        },
      );
      next();
    },
  );
  app.enableCors({ origin: process.env.CORS_ORIGIN ?? "*" });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionLoggingFilter());
  setupSwagger(app);
  await app.listen(process.env.API_PORT ?? 3001);
}
bootstrap();
