import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import nodemailer, { Transporter } from "nodemailer";
import { logError, logInfo, logWarn } from "./logging";

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromEmail: string;
  fromName: string;
};

@Injectable()
export class MailerService {
  private readonly log = new Logger(MailerService.name);
  private transporter: Transporter | null = null;
  private readonly smtp: SmtpConfig | null;

  constructor(private readonly config: ConfigService) {
    this.smtp = this.readSmtpConfig();
    if (!this.smtp) {
      logWarn(this.log, "smtp_not_configured");
      return;
    }
    this.transporter = nodemailer.createTransport({
      host: this.smtp.host,
      port: this.smtp.port,
      secure: this.smtp.secure,
      auth: {
        user: this.smtp.user,
        pass: this.smtp.pass,
      },
    });
  }

  private readSmtpConfig(): SmtpConfig | null {
    const host = this.config.get<string>("SMTP_HOST")?.trim() || "";
    const user = this.config.get<string>("SMTP_USER")?.trim() || "";
    const pass = this.config.get<string>("SMTP_PASS")?.trim() || "";
    const fromEmail =
      this.config.get<string>("SMTP_FROM_EMAIL")?.trim() || user;
    if (!host || !user || !pass || !fromEmail) return null;
    const port = Number(this.config.get<string>("SMTP_PORT") || "587");
    const secure =
      String(this.config.get<string>("SMTP_SECURE") || "false") === "true";
    const fromName =
      this.config.get<string>("SMTP_FROM_NAME")?.trim() || "AI Seller";
    return { host, port, secure, user, pass, fromEmail, fromName };
  }

  isEnabled() {
    return !!(this.smtp && this.transporter);
  }

  private siteUrl() {
    return (
      this.config.get<string>("WEB_PUBLIC_URL")?.replace(/\/$/, "") ||
      "http://localhost:3000"
    );
  }

  private brandHtml(
    title: string,
    lead: string,
    ctaText: string,
    ctaUrl: string,
  ) {
    return `
      <div style="font-family:Inter,Segoe UI,Arial,sans-serif;background:#0b1020;color:#fff;padding:24px;">
        <div style="max-width:560px;margin:0 auto;background:linear-gradient(180deg,#131a33,#0b1020);border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:24px;">
          <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#9aa4c7;">AI Seller</div>
          <h1 style="font-size:22px;line-height:1.3;margin:12px 0 8px;">${title}</h1>
          <p style="color:#d0d6eb;font-size:15px;line-height:1.6;margin:0 0 20px;">${lead}</p>
          <a href="${ctaUrl}" style="display:inline-block;background:#6d5df6;color:#fff;text-decoration:none;padding:11px 18px;border-radius:10px;font-weight:600;">${ctaText}</a>
          <p style="margin:20px 0 0;font-size:12px;color:#8f99bb;line-height:1.5;">Если кнопка не сработала, откройте ссылку вручную: ${ctaUrl}</p>
        </div>
      </div>
    `;
  }

  async sendMail(to: string, subject: string, html: string, text: string) {
    if (!this.transporter || !this.smtp) return;
    try {
      await this.transporter.sendMail({
        from: `"${this.smtp.fromName}" <${this.smtp.fromEmail}>`,
        to,
        subject,
        html,
        text,
      });
      logInfo(this.log, "email_sent", { to, subject });
    } catch (e) {
      logError(this.log, "email_send_failed", {
        to,
        subject,
        message: e instanceof Error ? e.message : "send_failed",
      });
    }
  }

  async sendVerificationEmail(email: string, token: string) {
    const url = `${this.siteUrl()}/verify-email?token=${encodeURIComponent(token)}`;
    await this.sendMail(
      email,
      "Подтвердите почту в AI Seller",
      this.brandHtml(
        "Подтвердите адрес почты",
        "Остался один шаг: подтвердите email, чтобы войти в кабинет и подключить бота.",
        "Подтвердить почту",
        url,
      ),
      `Подтвердите почту: ${url}`,
    );
  }

  async sendWelcomeEmail(email: string) {
    const url = `${this.siteUrl()}/login`;
    await this.sendMail(
      email,
      "Добро пожаловать в AI Seller",
      this.brandHtml(
        "Кабинет готов к работе",
        "Почта подтверждена. Теперь можно войти, настроить компанию и принимать заявки через Telegram-бота.",
        "Войти в кабинет",
        url,
      ),
      `Добро пожаловать в AI Seller. Вход: ${url}`,
    );
  }

  async sendPasswordResetEmail(email: string, token: string) {
    const url = `${this.siteUrl()}/reset-password?token=${encodeURIComponent(token)}`;
    await this.sendMail(
      email,
      "Восстановление пароля в AI Seller",
      this.brandHtml(
        "Сброс пароля",
        "Вы запросили восстановление пароля. Ссылка действует 60 минут.",
        "Сменить пароль",
        url,
      ),
      `Сбросьте пароль по ссылке: ${url}`,
    );
  }

  async sendPaymentReceiptEmail(
    email: string,
    payload: {
      amountRub: string;
      currency: string;
      description: string;
      paymentId: string;
      paidAtIso: string;
    },
  ) {
    const billingUrl = `${this.siteUrl()}/dashboard/billing`;
    const details = `
      <ul style="margin:12px 0 0;padding-left:18px;color:#d0d6eb;line-height:1.6;">
        <li>Сумма: ${payload.amountRub} ${payload.currency}</li>
        <li>Назначение: ${payload.description}</li>
        <li>ID платежа: ${payload.paymentId}</li>
        <li>Дата: ${new Date(payload.paidAtIso).toLocaleString("ru-RU")}</li>
      </ul>
    `;
    await this.sendMail(
      email,
      "Чек оплаты AI Seller",
      this.brandHtml(
        "Оплата успешно зачислена",
        `Спасибо за оплату. Чек по операции:<br/>${details}`,
        "Открыть тарифы",
        billingUrl,
      ),
      `Оплата принята: ${payload.amountRub} ${payload.currency}, ${payload.description}, ID ${payload.paymentId}`,
    );
  }
}
