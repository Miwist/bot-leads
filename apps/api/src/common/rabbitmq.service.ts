import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import * as amqp from "amqplib";
import { logError, logInfo, logWarn } from "./logging";

@Injectable()
export class RabbitMqService implements OnModuleDestroy {
  private readonly log = new Logger(RabbitMqService.name);
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;
  private connectInFlight: Promise<void> | null = null;

  isEnabled() {
    return String(process.env.RABBITMQ_ENABLED ?? "true")
      .trim()
      .toLowerCase() !== "false";
  }

  getConversationReplyQueue() {
    return (
      String(process.env.RABBITMQ_CONVERSATIONS_REPLY_QUEUE || "").trim() ||
      "conversations.reply.v1"
    );
  }

  private rabbitUrl() {
    return (
      String(process.env.RABBITMQ_URL || "").trim() ||
      "amqp://guest:guest@rabbitmq:5672"
    );
  }

  private async ensureConnected() {
    if (!this.isEnabled()) return;
    if (this.channel) return;
    if (this.connectInFlight) return this.connectInFlight;
    this.connectInFlight = this.connect();
    try {
      await this.connectInFlight;
    } finally {
      this.connectInFlight = null;
    }
  }

  private async connect() {
    const url = this.rabbitUrl();
    try {
      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();
      this.connection.on("close", () => {
        this.connection = null;
        this.channel = null;
        logWarn(this.log, "rabbitmq_connection_closed");
      });
      this.connection.on("error", (err) => {
        this.connection = null;
        this.channel = null;
        logError(this.log, "rabbitmq_connection_error", {
          message: err instanceof Error ? err.message : "connection_error",
        });
      });
      logInfo(this.log, "rabbitmq_connected", { url });
    } catch (error) {
      this.connection = null;
      this.channel = null;
      logError(this.log, "rabbitmq_connect_failed", {
        url,
        message: error instanceof Error ? error.message : "connect_error",
      });
      throw error;
    }
  }

  async publish(queue: string, payload: unknown): Promise<boolean> {
    if (!this.isEnabled()) return false;
    try {
      await this.ensureConnected();
      if (!this.channel) return false;
      await this.channel.assertQueue(queue, { durable: true });
      const body = Buffer.from(JSON.stringify(payload));
      const ok = this.channel.sendToQueue(queue, body, {
        persistent: true,
        contentType: "application/json",
      });
      if (!ok) {
        logWarn(this.log, "rabbitmq_publish_buffered", { queue });
      }
      return true;
    } catch (error) {
      logError(this.log, "rabbitmq_publish_failed", {
        queue,
        message: error instanceof Error ? error.message : "publish_error",
      });
      return false;
    }
  }

  async subscribe(
    queue: string,
    handler: (payload: unknown) => Promise<void>,
  ): Promise<boolean> {
    if (!this.isEnabled()) return false;
    try {
      await this.ensureConnected();
      if (!this.channel) return false;
      await this.channel.assertQueue(queue, { durable: true });
      await this.channel.prefetch(
        Number(process.env.RABBITMQ_PREFETCH || "10") || 10,
      );
      await this.channel.consume(queue, async (msg) => {
        if (!msg) return;
        try {
          const parsed = JSON.parse(msg.content.toString("utf8"));
          await handler(parsed);
          this.channel?.ack(msg);
        } catch (error) {
          logError(this.log, "rabbitmq_consume_failed", {
            queue,
            message: error instanceof Error ? error.message : "consume_error",
          });
          this.channel?.nack(msg, false, false);
        }
      });
      logInfo(this.log, "rabbitmq_subscribed", { queue });
      return true;
    } catch (error) {
      logError(this.log, "rabbitmq_subscribe_failed", {
        queue,
        message: error instanceof Error ? error.message : "subscribe_error",
      });
      return false;
    }
  }

  async onModuleDestroy() {
    await this.channel?.close().catch(() => undefined);
    await this.connection?.close().catch(() => undefined);
    this.channel = null;
    this.connection = null;
  }
}
