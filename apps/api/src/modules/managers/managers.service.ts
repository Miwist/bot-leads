import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Manager } from "../../database/entities";
import { Repository } from "typeorm";

@Injectable()
export class ManagersService {
  constructor(@InjectRepository(Manager) private repo: Repository<Manager>) {}

  async create(data: Partial<Manager>) {
    const count = await this.repo.count({ where: { companyId: data.companyId! } });
    return this.repo.save(this.repo.create({ ...data, rrOrder: count }));
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
