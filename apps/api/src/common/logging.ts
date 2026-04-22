import { Logger } from "@nestjs/common";

function safeStringify(payload: Record<string, unknown>) {
  try {
    return JSON.stringify(payload);
  } catch {
    return JSON.stringify({ event: "serialize_failed" });
  }
}

export function logInfo(
  logger: Logger,
  event: string,
  payload: Record<string, unknown> = {},
) {
  logger.log(safeStringify({ level: "info", event, ...payload }));
}

export function logWarn(
  logger: Logger,
  event: string,
  payload: Record<string, unknown> = {},
) {
  logger.warn(safeStringify({ level: "warn", event, ...payload }));
}

export function logError(
  logger: Logger,
  event: string,
  payload: Record<string, unknown> = {},
) {
  logger.error(safeStringify({ level: "error", event, ...payload }));
}
