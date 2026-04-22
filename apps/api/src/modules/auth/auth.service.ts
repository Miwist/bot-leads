import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { QueryFailedError, Repository } from "typeorm";
import { User } from "../../database/entities";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { UpdateProfileDto } from "./auth.dto";

const AUTH_FAILED = "Неверная почта или пароль.";
const EMAIL_TAKEN = "Пользователь с такой почтой уже зарегистрирован.";
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    private jwt: JwtService,
  ) {}
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
    return {
      token: this.jwt.sign({
        sub: u.id,
        email: u.email,
        companyId: u.companyId,
        role: u.role,
      }),
    };
  }
  async login(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const u = await this.users.findOne({ where: { email: normalizedEmail } });
    if (!u || !(await bcrypt.compare(password, u.passwordHash)))
      throw new UnauthorizedException(AUTH_FAILED);
    return {
      token: this.jwt.sign({
        sub: u.id,
        email: u.email,
        companyId: u.companyId,
        role: u.role,
      }),
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
