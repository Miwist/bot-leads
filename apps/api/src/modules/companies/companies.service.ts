import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Company } from "../../database/entities";
import { Repository } from "typeorm";

@Injectable()
export class CompaniesService {
  constructor(@InjectRepository(Company) private repo: Repository<Company>) {}

  create(data: Partial<Company>) {
    return this.repo.save(this.repo.create(data));
  }

  list() {
    return this.repo.find({ order: { createdAt: "DESC" } });
  }

  get(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  async update(id: string, data: Partial<Company>) {
    await this.repo.update({ id }, data);
    return this.get(id);
  }
}
