import { Injectable } from "@nestjs/common";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
@Injectable()
export class EncryptionService {
  encrypt(value: string): string {
    const key = Buffer.from(
      process.env.ENCRYPTION_KEY || "".padEnd(32, "0"),
    ).subarray(0, 32);
    const iv = randomBytes(16);
    const cipher = createCipheriv("aes-256-cbc", key, iv);
    return (
      iv.toString("hex") +
      ":" +
      cipher.update(value, "utf8", "hex") +
      cipher.final("hex")
    );
  }
  decrypt(payload: string): string {
    const key = Buffer.from(
      process.env.ENCRYPTION_KEY || "".padEnd(32, "0"),
    ).subarray(0, 32);
    const [ivHex, text] = payload.split(":");
    const decipher = createDecipheriv(
      "aes-256-cbc",
      key,
      Buffer.from(ivHex, "hex"),
    );
    return decipher.update(text, "hex", "utf8") + decipher.final("utf8");
  }
}
