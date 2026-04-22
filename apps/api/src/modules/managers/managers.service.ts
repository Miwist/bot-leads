import {
  BadRequestException,
  ConflictException,
  Injectable,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Manager, User } from "../../database/entities";
import { Repository } from "typeorm";
import * as bcrypt from "bcrypt";

@Injectable()
export class ManagersService {
  constructor(
    @InjectRepository(Manager) private repo: Repository<Manager>,
    @InjectRepository(User) private users: Repository<User>,
  ) {}

  async create(data: Partial<Manager> & { password?: string }) {
    const { password, ...managerData } = data;
    if (!data.companyId || !data.email) {
      throw new BadRequestException("Нужны companyId и email");
    }
    if (!password || password.length < 6) {
      throw new BadRequestException(
        "Для менеджера нужно задать пароль не короче 6 символов",
      );
    }

    const normalizedEmail = data.email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(password, 10);
    const existingUser = await this.users.findOne({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      if (
        existingUser.role !== "manager" ||
        existingUser.companyId !== data.companyId
      ) {
        throw new ConflictException("Пользователь с таким email уже существует");
      }
      await this.users.update(
        { id: existingUser.id },
        { passwordHash, companyId: data.companyId, role: "manager" },
      );
    } else {
      await this.users.save(
        this.users.create({
          email: normalizedEmail,
          passwordHash,
          role: "manager",
          companyId: data.companyId,
        }),
      );
    }

    const existingManager = await this.repo.findOne({
      where: { companyId: data.companyId, email: normalizedEmail },
    });
    if (existingManager) {
      await this.repo.update(
        { id: existingManager.id },
        {
          name: data.name,
          chatId: data.chatId ?? null,
          isActive: data.isActive ?? existingManager.isActive,
        },
      );
      return this.repo.findOne({ where: { id: existingManager.id } });
    }

    const count = await this.repo.count({ where: { companyId: data.companyId } });
    return this.repo.save(
      this.repo.create({
        ...managerData,
        email: normalizedEmail,
        rrOrder: count,
      }),
    );
  }

  list(companyId: string) {
    return this.repo.find({ where: { companyId }, order: { rrOrder: "ASC" } });
  }

  async update(id: string, data: Partial<Manager>) {
    await this.repo.update({ id }, data);
    return this.repo.findOne({ where: { id } });
  }

  delete(id: string) {
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
