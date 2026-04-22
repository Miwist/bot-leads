import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Manager, User } from "../../database/entities";
import { Repository } from "typeorm";
import * as bcrypt from "bcrypt";

export type JwtActor = {
  sub?: string;
  companyId?: string | null;
  role?: string;
};

@Injectable()
export class ManagersService {
  constructor(
    @InjectRepository(Manager) private repo: Repository<Manager>,
    @InjectRepository(User) private users: Repository<User>,
  ) {}

  private async resolveCompanyId(actor: JwtActor): Promise<string | null> {
    if (actor.role === "admin") {
      return null;
    }
    if (actor.sub) {
      const row = await this.users.findOne({
        where: { id: actor.sub },
        select: { companyId: true },
      });
      if (row?.companyId) {
        return row.companyId;
      }
    }
    return actor.companyId ?? null;
  }

  async create(
    data: Partial<Manager> & { password?: string },
    actor: JwtActor,
  ) {
    const { password, ...rest } = data;
    const payload = { ...rest } as Partial<Manager> & { password?: string };
    if (actor.role === "admin") {
      if (!payload.companyId || !String(payload.companyId).trim()) {
        throw new BadRequestException("Нужен companyId");
      }
    } else {
      const cid = await this.resolveCompanyId(actor);
      if (!cid) {
        throw new BadRequestException("Сначала создайте компанию в настройках");
      }
      payload.companyId = cid;
    }

    const companyId = String(payload.companyId || "").trim();
    const emailRaw = String(payload.email || "").trim();
    if (!companyId || !emailRaw) {
      throw new BadRequestException("Нужны компания и почта менеджера");
    }
    if (!password || password.length < 6) {
      throw new BadRequestException(
        "Для менеджера нужно задать пароль не короче 6 символов",
      );
    }

    const nameTrimmed = String(payload.name ?? "").trim();
    if (!nameTrimmed) {
      throw new BadRequestException("Укажите имя менеджера");
    }

    const chatRaw = payload.chatId;
    const chatId =
      chatRaw == null || String(chatRaw).trim() === ""
        ? null
        : String(chatRaw).trim();

    const normalizedEmail = emailRaw.toLowerCase();
    const passwordHash = await bcrypt.hash(password, 10);
    const existingUser = await this.users.findOne({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      if (
        existingUser.role !== "manager" ||
        existingUser.companyId !== companyId
      ) {
        throw new ConflictException(
          "Пользователь с таким email уже существует",
        );
      }
      await this.users.update(
        { id: existingUser.id },
        { passwordHash, companyId, role: "manager" },
      );
    } else {
      await this.users.save(
        this.users.create({
          email: normalizedEmail,
          passwordHash,
          role: "manager",
          companyId,
        }),
      );
    }

    const existingManager = await this.repo.findOne({
      where: { companyId, email: normalizedEmail },
    });
    if (existingManager) {
      await this.repo.update(
        { id: existingManager.id },
        {
          name: nameTrimmed,
          chatId,
          isActive: payload.isActive ?? existingManager.isActive,
        },
      );
      return this.repo.findOne({ where: { id: existingManager.id } });
    }

    const count = await this.repo.count({ where: { companyId } });
    return this.repo.save(
      this.repo.create({
        companyId,
        name: nameTrimmed,
        email: normalizedEmail,
        chatId,
        isActive: payload.isActive ?? true,
        rrOrder: count,
      }),
    );
  }

  async list(companyId: string, actor: JwtActor) {
    if (!companyId?.trim()) {
      throw new BadRequestException("Нужен query-параметр companyId");
    }
    if (actor.role !== "admin") {
      const cid = await this.resolveCompanyId(actor);
      if (!cid || cid !== companyId) {
        throw new ForbiddenException("Нет доступа к этой компании");
      }
    }
    return this.repo.find({
      where: { companyId },
      order: { rrOrder: "ASC" },
    });
  }

  async update(id: string, data: Partial<Manager>, actor: JwtActor) {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException();
    }
    if (actor.role !== "admin") {
      const cid = await this.resolveCompanyId(actor);
      if (!cid || cid !== row.companyId) {
        throw new ForbiddenException("Нет доступа к этой компании");
      }
    }
    await this.repo.update({ id }, data);
    return this.repo.findOne({ where: { id } });
  }

  async delete(id: string, actor: JwtActor) {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException();
    }
    if (actor.role !== "admin") {
      const cid = await this.resolveCompanyId(actor);
      if (!cid || cid !== row.companyId) {
        throw new ForbiddenException("Нет доступа к этой компании");
      }
    }
    return this.repo.delete({ id });
  }

  async next(companyId: string) {
    const all = await this.repo.find({
      where: { companyId, isActive: true },
      order: { rrOrder: "ASC" },
    });
    return all[0] || null;
  }
}
