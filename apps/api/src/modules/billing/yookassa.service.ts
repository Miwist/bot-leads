import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import { randomUUID } from "crypto";

type YooPaymentCreate = {
  amountValue: string;
  currency: string;
  description: string;
  returnUrl: string;
  metadata: Record<string, string>;
};

@Injectable()
export class YooKassaService {
  private readonly log = new Logger(YooKassaService.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.shopId() && this.secretKey());
  }

  private shopId() {
    return this.config.get<string>("YOOKASSA_SHOP_ID")?.trim();
  }

  private secretKey() {
    return this.config.get<string>("YOOKASSA_SECRET_KEY")?.trim();
  }

  private authHeader(): string {
    const shopId = this.shopId()!;
    const secret = this.secretKey()!;
    return `Basic ${Buffer.from(`${shopId}:${secret}`).toString("base64")}`;
  }

  async createRedirectPayment(input: YooPaymentCreate) {
    const idempotenceKey = randomUUID();
    const metadata = Object.fromEntries(
      Object.entries(input.metadata).filter(
        ([, v]) => v != null && String(v).trim().length > 0,
      ),
    );
    const { data } = await axios.post(
      "https://api.yookassa.ru/v3/payments",
      {
        amount: { value: input.amountValue, currency: input.currency },
        capture: true,
        confirmation: {
          type: "redirect",
          return_url: input.returnUrl,
        },
        description: input.description,
        metadata,
      },
      {
        headers: {
          Authorization: this.authHeader(),
          "Idempotence-Key": idempotenceKey,
          "Content-Type": "application/json",
        },
        timeout: 20000,
      },
    );
    return {
      yookassaPaymentId: String(data.id),
      confirmationUrl: String(data.confirmation?.confirmation_url || ""),
      status: String(data.status || ""),
    };
  }

  async getPayment(yookassaPaymentId: string) {
    const { data } = await axios.get(
      `https://api.yookassa.ru/v3/payments/${yookassaPaymentId}`,
      {
        headers: {
          Authorization: this.authHeader(),
          "Content-Type": "application/json",
        },
        timeout: 20000,
      },
    );
    return data as Record<string, unknown>;
  }

  logMissingConfig() {
    if (!this.isConfigured()) {
      this.log.warn(
        "ЮKassa: не заданы YOOKASSA_SHOP_ID / YOOKASSA_SECRET_KEY — оплата недоступна",
      );
    }
  }
}
