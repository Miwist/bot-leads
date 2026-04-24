export const TELEGRAM_MULTIMODAL_MAX_BYTES = 18 * 1024 * 1024;

const PDF_MIME_TYPES = new Set([
  "application/pdf",
  "application/x-pdf",
  "application/acrobat",
  "applications/vnd.pdf",
  "text/pdf",
]);

const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const PDF_EXT_RE = /\.pdf$/i;
const IMAGE_EXT_RE = /\.(jpg|jpeg|png|webp)$/i;

export type TelegramDocumentKind = "pdf" | "image" | "unsupported" | "too_large";

export function classifyTelegramDocument(input: {
  mimeType?: string;
  fileName?: string;
  fileSize?: number;
  maxBytes?: number;
}): TelegramDocumentKind {
  const mime = String(input.mimeType || "").toLowerCase().trim();
  const fileName = String(input.fileName || "").toLowerCase().trim();
  const fileSize = Number(input.fileSize || 0);
  const maxBytes = Number(input.maxBytes || TELEGRAM_MULTIMODAL_MAX_BYTES);

  if (fileSize > maxBytes) return "too_large";
  if (PDF_MIME_TYPES.has(mime) || PDF_EXT_RE.test(fileName)) return "pdf";
  if (IMAGE_MIME_TYPES.has(mime) || IMAGE_EXT_RE.test(fileName)) return "image";
  return "unsupported";
}
