import { Logger } from "@nestjs/common";

const SECRET_KEY_RE =
  /(token|secret|password|passwd|jwt|authorization|cookie|api[_-]?key|encryption[_-]?key)/i;
const BOT_TOKEN_RE = /\b\d{7,12}:[A-Za-z0-9_-]{20,}\b/g;
const BEARER_RE = /\bBearer\s+[A-Za-z0-9\-._~+/]+=*/gi;

function maskSensitiveString(text: string): string {
  return text
    .replace(BOT_TOKEN_RE, "[redacted_bot_token]")
    .replace(BEARER_RE, "Bearer [redacted]");
}

function sanitizeValue(value: unknown, keyName = ""): unknown {
  if (value == null) return value;
  if (typeof value === "string") {
    if (SECRET_KEY_RE.test(keyName)) return "[redacted]";
    return maskSensitiveString(value);
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map((v) => sanitizeValue(v));
  if (typeof value === "object") {
    const input = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input)) {
      if (SECRET_KEY_RE.test(k)) {
        out[k] = "[redacted]";
      } else {
        out[k] = sanitizeValue(v, k);
      }
    }
    return out;
  }
  return String(value);
}

function safeStringify(payload: Record<string, unknown>) {
  try {
    return JSON.stringify(sanitizeValue(payload));
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
