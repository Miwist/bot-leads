import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  BillingPayment,
  Company,
  Plan,
  Subscription,
  UsageCounter,
} from "../../database/entities";
import { Repository } from "typeorm";
import { YooKassaService } from "./yookassa.service";

const PLAN_MONTHLY_PRICE_RUB: Record<string, number> = {
  starter: 499,
  growth: 1299,
  pro: 3299,
};

@Injectable()
export class BillingService {
  private readonly log = new Logger(BillingService.name);
  private readonly discountPercentByMonths: Record<number, number> = {
    1: 0,
    3: 1,
    6: 3,
    12: 5,
  };

  constructor(
    @InjectRepository(Company) private companies: Repository<Company>,
    @InjectRepository(Plan) private plans: Repository<Plan>,
    @InjectRepository(Subscription) private subs: Repository<Subscription>,
    @InjectRepository(UsageCounter) private usage: Repository<UsageCounter>,
    @InjectRepository(BillingPayment)
    private payments: Repository<BillingPayment>,
    private readonly yookassa: YooKassaService,
  ) {
    this.yookassa.logMissingConfig();
  }

  async current(companyId: string) {
    const company = await this.companies.findOne({ where: { id: companyId } });
    const sub =
      (await this.subs.findOne({ where: { companyId, isActive: true } })) ||
      (await this.subs.save(
        this.subs.create({ companyId, planCode: "starter" }),
      ));
    const plan = await this.plans.findOne({ where: { code: sub.planCode } });
    const plans = await this.plans.find({ order: { monthlyLeadLimit: "ASC" } });
    const monthKey = new Date().toISOString().slice(0, 7);
    const usage =
      (await this.usage.findOne({ where: { companyId, monthKey } })) ||
      (await this.usage.save(this.usage.create({ companyId, monthKey })));
    const paid = await this.payments.findOne({
      where: { companyId, status: "succeeded" },
      order: { createdAt: "DESC" },
    });
    const createdAt = company?.createdAt || sub.createdAt;
    const trialEndsAt = new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    const trialActive = !paid && Date.now() < trialEndsAt.getTime();
    return {
      plan,
      usage,
      subscription: sub,
      plans,
      trial: {
        active: trialActive,
        days: 7,
        endsAt: trialEndsAt.toISOString(),
      },
      discounts: this.discountPercentByMonths,
      yookassaReady: this.yookassa.isConfigured(),
      multimodalTelegram: this.planSupportsMultimodal(sub.planCode),
    };
  }

  /** Голос, фото и PDF в Telegram — тарифы Business / Pro (не Basic). */
  planSupportsMultimodal(planCode: string): boolean {
    const c = String(planCode || "starter").toLowerCase();
    return c === "growth" || c === "pro";
  }

  async supportsMultimodalTelegram(companyId: string): Promise<boolean> {
    if (!companyId || companyId === "__shared__") return false;
    const sub =
      (await this.subs.findOne({ where: { companyId, isActive: true } })) ||
      (await this.subs.findOne({ where: { companyId } }));
    const code = sub?.planCode || "starter";
    return this.planSupportsMultimodal(code);
  }

  /** Смена тарифа только после успешной оплаты (webhook ЮKassa). */
  async changePlan(companyId: string, planCode: string) {
    const active = await this.subs.findOne({
      where: { companyId, isActive: true },
    });
    if (active) {
      await this.subs.update({ id: active.id }, { planCode });
    } else {
      await this.subs.save(
        this.subs.create({ companyId, planCode, isActive: true }),
      );
    }
    return this.current(companyId);
  }

  async createCheckout(input: {
    companyId: string;
    planCode?: string;
    months?: number;
    amountRub?: number;
  }) {
    if (!this.yookassa.isConfigured()) {
      throw new BadRequestException(
        "Оплата не настроена: задайте YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY",
      );
    }
    const { companyId } = input;
    if (!companyId) {
      throw new BadRequestException("Нужен companyId");
    }

    const months =
      input.months != null && Number.isFinite(Number(input.months))
        ? Math.min(36, Math.max(1, Math.floor(Number(input.months))))
        : null;
    const customAmount =
      input.amountRub != null && Number.isFinite(Number(input.amountRub))
        ? Math.max(1, Math.floor(Number(input.amountRub)))
        : null;

    let amountRub = 0;
    let planCode: string | null = input.planCode?.trim() || null;
    let description = "";

    const discountPercent = this.discountPercentByMonths[months || 1] || 0;
    if (planCode && months) {
      const price = PLAN_MONTHLY_PRICE_RUB[planCode];
      if (!price) {
        throw new BadRequestException("Неизвестный тариф");
      }
      const full = price * months;
      amountRub = Math.round(full * (1 - discountPercent / 100));
      description = `Тариф ${planCode}, ${months} мес.`;
    } else if (customAmount) {
      amountRub = customAmount;
      planCode = null;
      description = "Произвольная сумма";
    } else {
      throw new BadRequestException(
        "Укажите либо тариф и срок (месяцы), либо произвольную сумму",
      );
    }

    const amountValue = `${amountRub.toFixed(2)}`;
    const baseRaw =
      process.env.YOOKASSA_RETURN_URL?.trim() ||
      `${process.env.WEB_PUBLIC_URL?.replace(/\/$/, "") || "http://localhost:3000"}/dashboard/billing`;
    const withPayment = baseRaw.includes("payment=")
      ? baseRaw
      : `${baseRaw}${baseRaw.includes("?") ? "&" : "?"}payment=success`;

    const row = await this.payments.save(
      this.payments.create({
        companyId,
        planCode,
        months,
        amountRub: amountValue,
        currency: "RUB",
        status: "pending",
        returnUrl: withPayment,
        description,
      }),
    );

    const created = await this.yookassa.createRedirectPayment({
      amountValue,
      currency: "RUB",
      description,
      returnUrl: `${withPayment}&paymentId=${row.id}`,
      metadata: {
        companyId,
        planCode: planCode || "",
        months: months != null ? String(months) : "",
        paymentRecordId: row.id,
      },
    });

    await this.payments.update(
      { id: row.id },
      {
        yookassaPaymentId: created.yookassaPaymentId,
        confirmationUrl: created.confirmationUrl,
      },
    );

    return {
      paymentId: row.id,
      confirmationUrl: created.confirmationUrl,
      amountRub,
      discountPercent,
      planCode,
      months,
    };
  }

  async paymentStatus(companyId: string, paymentId: string) {
    const row = await this.payments.findOne({
      where: { id: paymentId, companyId },
    });
    if (!row) throw new NotFoundException("Платёж не найден");
    return {
      paymentId: row.id,
      status: row.status,
      planCode: row.planCode,
      amountRub: row.amountRub,
    };
  }

  async handleYooKassaNotification(body: Record<string, unknown>) {
    const event = String(body.event || "");
    const obj = (body.object || {}) as Record<string, unknown>;
    if (!obj || typeof obj !== "object") {
      return { ok: true };
    }
    if (event !== "payment.succeeded" || String(obj.status) !== "succeeded") {
      return { ok: true };
    }
    const yid = String(obj.id || "");
    if (!yid) return { ok: true };

    const payment = await this.payments.findOne({
      where: { yookassaPaymentId: yid },
    });
    if (!payment) {
      this.log.warn(`ЮKassa: платёж ${yid} не найден в БД`);
      return { ok: true };
    }
    if (payment.status === "succeeded") {
      return { ok: true };
    }

    await this.payments.update({ id: payment.id }, { status: "succeeded" });

    const meta = (obj.metadata || {}) as Record<string, string>;
    const planFromMeta = meta.planCode?.trim();
    if (planFromMeta && payment.companyId) {
      await this.changePlan(payment.companyId, planFromMeta);
    }

    return { ok: true };
  }

  async canCreateLead(companyId: string) {
    const x = await this.current(companyId);
    return x.usage.leadsUsed < (x.plan?.monthlyLeadLimit || 100);
  }

  async incrementLead(companyId: string) {
    const monthKey = new Date().toISOString().slice(0, 7);
    const usage =
      (await this.usage.findOne({ where: { companyId, monthKey } })) ||
      this.usage.create({ companyId, monthKey });
    usage.leadsUsed += 1;
    await this.usage.save(usage);
  }
}
