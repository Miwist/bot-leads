import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import { logError, logInfo, logWarn } from "./logging";

@Injectable()
export class S3StorageService {
  private readonly log = new Logger(S3StorageService.name);
  private readonly client: S3Client | null;
  private readonly bucket: string;
  private readonly endpoint: string;
  private readonly publicBaseUrl: string;

  constructor(private readonly config: ConfigService) {
    const endpoint = (this.config.get<string>("S3_ENDPOINT") || "").trim();
    const region = (this.config.get<string>("S3_REGION") || "ru-1").trim();
    const bucket = (this.config.get<string>("S3_BUCKET") || "").trim();
    const accessKeyId = (this.config.get<string>("S3_ACCESS_KEY") || "").trim();
    const secretAccessKey = (
      this.config.get<string>("S3_SECRET_KEY") || ""
    ).trim();
    this.publicBaseUrl = (
      this.config.get<string>("S3_PUBLIC_BASE_URL") || ""
    ).trim();
    this.endpoint = endpoint.replace(/\/+$/g, "");
    this.bucket = bucket;
    if (endpoint && bucket && accessKeyId && secretAccessKey) {
      this.client = new S3Client({
        region,
        endpoint,
        credentials: { accessKeyId, secretAccessKey },
        forcePathStyle: true,
      });
      return;
    }
    this.client = null;
    logWarn(this.log, "s3_disabled", {
      reason: "missing_config",
    });
  }

  isReady() {
    return this.client != null && Boolean(this.bucket);
  }

  private buildUrl(key: string) {
    const cleanKey = String(key || "").replace(/^\/+/, "");
    if (this.publicBaseUrl) {
      const base = this.publicBaseUrl.replace(/\/+$/g, "");
      // Support both styles:
      // 1) S3_PUBLIC_BASE_URL=https://s3.twcstorage.ru
      // 2) S3_PUBLIC_BASE_URL=https://s3.twcstorage.ru/<bucket>
      const endsWithBucket = base.endsWith(`/${this.bucket}`);
      return endsWithBucket
        ? `${base}/${cleanKey}`
        : `${base}/${this.bucket}/${cleanKey}`;
    }
    return `${this.endpoint}/${this.bucket}/${cleanKey}`;
  }

  async uploadDataUrl(
    dataUrl: string,
    opts?: { prefix?: string; fileName?: string },
  ): Promise<{
    key: string;
    url: string;
    mime: string;
    size: number;
    fileName: string;
  } | null> {
    if (!this.client || !this.bucket) return null;
    const raw = String(dataUrl || "");
    const matched = raw.match(/^data:(.+?);base64,(.+)$/);
    if (!matched) return null;
    const mime = matched[1] || "application/octet-stream";
    const base64 = matched[2] || "";
    const body = Buffer.from(base64, "base64");
    const safeName = String(opts?.fileName || "file")
      .trim()
      .replace(/[^a-zA-Z0-9._-]+/g, "_")
      .slice(0, 96);
    const key = `${(opts?.prefix || "uploads").replace(/\/+$/g, "")}/${Date.now()}-${randomUUID()}-${safeName}`;
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: mime,
        }),
      );
      logInfo(this.log, "s3_upload_ok", {
        key,
        mime,
        size: body.byteLength,
      });
    } catch (e) {
      logError(this.log, "s3_upload_failed", {
        key,
        mime,
        size: body.byteLength,
        message: e instanceof Error ? e.message : "upload_error",
      });
      throw e;
    }
    return {
      key,
      url: this.buildUrl(key),
      mime,
      size: body.byteLength,
      fileName: safeName || "file",
    };
  }

  extractKeyFromUrl(url: string): string | null {
    const raw = String(url || "").trim();
    if (!raw) return null;
    if (this.publicBaseUrl) {
      const base = this.publicBaseUrl.replace(/\/+$/g, "");
      const baseWithBucket = `${base}/${this.bucket}`.replace(/\/+$/g, "");
      if (raw.startsWith(baseWithBucket + "/")) {
        return raw.slice(baseWithBucket.length + 1) || null;
      }
      if (raw.startsWith(base + "/")) {
        const tail = raw.slice(base.length + 1);
        if (tail.startsWith(`${this.bucket}/`)) {
          return tail.slice(this.bucket.length + 1) || null;
        }
        return tail || null;
      }
    }
    const prefix = `${this.endpoint}/${this.bucket}/`;
    if (raw.startsWith(prefix)) {
      return raw.slice(prefix.length) || null;
    }
    return null;
  }

  async deleteByKey(key: string): Promise<boolean> {
    if (!this.client || !this.bucket) return false;
    const safeKey = String(key || "").trim();
    if (!safeKey) return false;
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: safeKey,
        }),
      );
      logInfo(this.log, "s3_delete_ok", { key: safeKey });
    } catch (e) {
      logError(this.log, "s3_delete_failed", {
        key: safeKey,
        message: e instanceof Error ? e.message : "delete_error",
      });
      throw e;
    }
    return true;
  }

  async deleteByUrl(url: string): Promise<boolean> {
    const key = this.extractKeyFromUrl(url);
    if (!key) return false;
    return this.deleteByKey(key);
  }
}
