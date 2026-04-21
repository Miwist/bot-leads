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
    return this.repo.find();
  }
  update(id: string, data: Partial<Company>) {
    return this.repo.update({ id }, data);
  }
}
