import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { QueryFailedError, Repository } from "typeorm";
import { User } from "../../database/entities";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { createHash, randomBytes } from "node:crypto";
import { UpdateProfileDto } from "./auth.dto";
import { MailerService } from "../../common/mailer.service";
import { AdminTelegramService } from "../../common/admin-telegram.service";
import { logInfo } from "../../common/logging";

const AUTH_FAILED = "Неверная почта или пароль.";
const EMAIL_TAKEN = "Пользователь с такой почтой уже зарегистрирован.";
const EMAIL_NOT_VERIFIED =
  "Почта не подтверждена. Проверьте входящие и подтвердите адрес.";
@Injectable()
export class AuthService {
  private readonly log = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User) private users: Repository<User>,
    private jwt: JwtService,
    private readonly mailer: MailerService,
    private readonly adminTelegram: AdminTelegramService,
  ) {}

  private tokenHash(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  private makeToken() {
    return randomBytes(32).toString("hex");
  }

  private jwtPayload(u: User) {
    return {
      sub: u.id,
      email: u.email,
      companyId: u.companyId,
      role: u.role,
    };
  }

  private async issueEmailVerification(user: User) {
    const token = this.makeToken();
    const hash = this.tokenHash(token);
    await this.users.update(
      { id: user.id },
      {
        emailVerificationTokenHash: hash,
        emailVerificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    );
    await this.mailer.sendVerificationEmail(user.email, token);
  }

  async register(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await this.users.findOne({
      where: { email: normalizedEmail },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(EMAIL_TAKEN);
    }
    const u = this.users.create({
      email: normalizedEmail,
      passwordHash: await bcrypt.hash(password, 10),
      emailVerified: false,
    });
    try {
      await this.users.save(u);
    } catch (e) {
      if (
        e instanceof QueryFailedError &&
        (e as QueryFailedError & { driverError?: { code?: string } })
          .driverError?.code === "23505"
      ) {
        throw new ConflictException(EMAIL_TAKEN);
      }
      throw e;
    }
    await this.issueEmailVerification(u);
    await this.adminTelegram.notify(
      `Новая регистрация в AI Seller\nEmail: ${u.email}\nUser ID: ${u.id}`,
    );
    logInfo(this.log, "user_registered", { userId: u.id, email: u.email });
    return {
      ok: true,
      requiresEmailVerification: true,
      message: "Письмо с подтверждением отправлено на вашу почту.",
    };
  }

  async login(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const u = await this.users.findOne({ where: { email: normalizedEmail } });
    if (!u || !(await bcrypt.compare(password, u.passwordHash)))
      throw new UnauthorizedException(AUTH_FAILED);
    if (!u.emailVerified) {
      throw new UnauthorizedException(EMAIL_NOT_VERIFIED);
    }
    return {
      token: this.jwt.sign(this.jwtPayload(u)),
    };
  }

  async verifyEmail(token: string) {
    const hash = this.tokenHash(String(token || ""));
    const user = await this.users.findOne({
      where: { emailVerificationTokenHash: hash },
    });
    if (!user || !user.emailVerificationExpiresAt) {
      throw new BadRequestException("Ссылка подтверждения недействительна.");
    }
    if (user.emailVerificationExpiresAt.getTime() < Date.now()) {
      throw new BadRequestException("Срок действия ссылки истёк.");
    }
    await this.users.update(
      { id: user.id },
      {
        emailVerified: true,
        emailVerificationTokenHash: null,
        emailVerificationExpiresAt: null,
      },
    );
    await this.mailer.sendWelcomeEmail(user.email);
    const fresh = await this.users.findOneOrFail({ where: { id: user.id } });
    return {
      ok: true,
      token: this.jwt.sign(this.jwtPayload(fresh)),
      message: "Почта успешно подтверждена.",
    };
  }

  async resendVerification(email: string) {
    const normalizedEmail = String(email || "")
      .trim()
      .toLowerCase();
    const user = await this.users.findOne({
      where: { email: normalizedEmail },
    });
    if (!user || user.emailVerified) {
      return { ok: true };
    }
    await this.issueEmailVerification(user);
    return { ok: true };
  }

  async requestPasswordReset(email: string) {
    const normalizedEmail = String(email || "")
      .trim()
      .toLowerCase();
    const user = await this.users.findOne({
      where: { email: normalizedEmail },
    });
    if (!user || !user.emailVerified) {
      return { ok: true };
    }
    const token = this.makeToken();
    const hash = this.tokenHash(token);
    await this.users.update(
      { id: user.id },
      {
        passwordResetTokenHash: hash,
        passwordResetExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    );
    await this.mailer.sendPasswordResetEmail(user.email, token);
    return { ok: true };
  }

  async resetPassword(token: string, password: string) {
    const hash = this.tokenHash(String(token || ""));
    const user = await this.users.findOne({
      where: { passwordResetTokenHash: hash },
    });
    if (!user || !user.passwordResetExpiresAt) {
      throw new BadRequestException("Ссылка восстановления недействительна.");
    }
    if (user.passwordResetExpiresAt.getTime() < Date.now()) {
      throw new BadRequestException(
        "Срок действия ссылки восстановления истёк.",
      );
    }
    await this.users.update(
      { id: user.id },
      {
        passwordHash: await bcrypt.hash(password, 10),
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
      },
    );
    return {
      ok: true,
      message: "Пароль обновлён. Теперь вы можете войти в кабинет.",
    };
  }

  async me(userId: string) {
    const u = await this.users.findOne({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        companyId: true,
        telegramChatId: true,
      },
    });
    if (!u) {
      throw new UnauthorizedException();
    }
    return u;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    if (dto.telegramChatId === undefined) {
      return this.me(userId);
    }
    const trimmed = String(dto.telegramChatId).trim();
    if (trimmed === "") {
      await this.users.update({ id: userId }, { telegramChatId: null });
      return this.me(userId);
    }
    if (!/^-?\d+$/.test(trimmed)) {
      throw new BadRequestException(
        "Telegram ID — только цифры (для супергрупп иногда с минусом в начале).",
      );
    }
    await this.users.update({ id: userId }, { telegramChatId: trimmed });
    return this.me(userId);
  }
}
