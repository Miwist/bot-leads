import {
  classifyTelegramDocument,
  TELEGRAM_MULTIMODAL_MAX_BYTES,
} from "../modules/telegram/telegram-file-policy";

function assertEqual(actual: unknown, expected: unknown, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
  }
}

function run() {
  assertEqual(
    classifyTelegramDocument({
      mimeType: "application/pdf",
      fileName: "offer.pdf",
      fileSize: 1024,
    }),
    "pdf",
    "pdf by mime",
  );

  assertEqual(
    classifyTelegramDocument({
      mimeType: "application/octet-stream",
      fileName: "scan.PDF",
      fileSize: 1024,
    }),
    "pdf",
    "pdf by extension",
  );

  assertEqual(
    classifyTelegramDocument({
      mimeType: "image/png",
      fileName: "photo.png",
      fileSize: 1024,
    }),
    "image",
    "image by mime",
  );

  assertEqual(
    classifyTelegramDocument({
      mimeType: "application/octet-stream",
      fileName: "image.JPEG",
      fileSize: 1024,
    }),
    "image",
    "image by extension",
  );

  assertEqual(
    classifyTelegramDocument({
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      fileName: "doc.docx",
      fileSize: 1024,
    }),
    "unsupported",
    "unsupported docx",
  );

  assertEqual(
    classifyTelegramDocument({
      mimeType: "application/pdf",
      fileName: "big.pdf",
      fileSize: TELEGRAM_MULTIMODAL_MAX_BYTES + 1,
    }),
    "too_large",
    "too large file",
  );

  console.log("telegram-file-policy-test: OK");
}

run();
