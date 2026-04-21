import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Lead, LeadAssignment, LeadStatus } from "../../database/entities";
import { Repository } from "typeorm";
import { ManagersService } from "../managers/managers.service";

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(Lead) private leads: Repository<Lead>,
    @InjectRepository(LeadAssignment)
    private assignRepo: Repository<LeadAssignment>,
    private managers: ManagersService,
  ) {}

  list(companyId: string, status?: LeadStatus) {
    return this.leads.find({
      where: { companyId, ...(status ? { status } : {}) },
      order: { createdAt: "DESC" },
    });
  }

  async stats(companyId: string) {
    const rows = await this.leads.find({ where: { companyId }, order: { createdAt: "DESC" } });
    return {
      total: rows.length,
      newCount: rows.filter((x) => x.status === LeadStatus.NEW).length,
      assignedCount: rows.filter((x) => x.status === LeadStatus.ASSIGNED).length,
      qualifiedCount: rows.filter((x) => x.status === LeadStatus.QUALIFIED).length,
      latest: rows.slice(0, 5),
    };
  }

  get(id: string) {
    return this.leads.findOne({ where: { id } });
  }

  updateStatus(id: string, status: LeadStatus) {
    return this.leads.update({ id }, { status });
  }

  async createLead(payload: Partial<Lead>) {
    const lead = await this.leads.save(this.leads.create(payload));
    await this.assignNow(lead.id);
    return this.get(lead.id);
  }

  async assignNow(leadId: string) {
    const lead = await this.leads.findOne({ where: { id: leadId } });
    if (!lead) return null;
    const manager = await this.managers.next(lead.companyId);
    if (!manager) return lead;
    await this.leads.update(
      { id: leadId },
      { assignedManagerId: manager.id, status: LeadStatus.ASSIGNED },
    );
    await this.assignRepo.save(
      this.assignRepo.create({
        leadId,
        companyId: lead.companyId,
        managerId: manager.id,
      }),
    );
    return this.get(leadId);
  }
}
