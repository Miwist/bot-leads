import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Company, Lead, LeadAssignment } from "../../database/entities";
import { Repository } from "typeorm";
import { ManagersService } from "../managers/managers.service";
import {
  normalizeLeadStatuses,
  SYSTEM_STATUS_IN_PROGRESS,
  SYSTEM_STATUS_NEW,
} from "../../common/lead-statuses";

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(Lead) private leads: Repository<Lead>,
    @InjectRepository(LeadAssignment)
    private assignRepo: Repository<LeadAssignment>,
    @InjectRepository(Company) private companies: Repository<Company>,
    private managers: ManagersService,
  ) {}

  list(
    companyId: string,
    filters?: {
      status?: string;
      source?: string;
      dateFrom?: string;
      dateTo?: string;
      q?: string;
    },
  ) {
    const qb = this.leads
      .createQueryBuilder("l")
      .where("l.companyId = :companyId", { companyId })
      .orderBy("l.createdAt", "DESC");
    const status = filters?.status?.trim();
    if (status) {
      qb.andWhere("l.status = :status", { status });
    }
    const source = filters?.source?.trim();
    if (source) {
      qb.andWhere("l.source = :source", { source });
    }
    const df = filters?.dateFrom?.trim();
    if (df) {
      const d = new Date(df);
      if (!Number.isNaN(d.getTime())) {
        qb.andWhere("l.createdAt >= :df", { df: d });
      }
    }
    const dt = filters?.dateTo?.trim();
    if (dt) {
      const d = new Date(dt);
      if (!Number.isNaN(d.getTime())) {
        d.setHours(23, 59, 59, 999);
        qb.andWhere("l.createdAt <= :dt", { dt: d });
      }
    }
    const q = filters?.q?.trim();
    if (q) {
      const esc = q.replace(/%/g, "\\%").replace(/_/g, "\\_");
      const like = `%${esc}%`;
      qb.andWhere(
        "(l.fullName ILIKE :like OR l.phone ILIKE :like OR l.need ILIKE :like OR COALESCE(l.email, '') ILIKE :like OR COALESCE(l.comment, '') ILIKE :like)",
        { like },
      );
    }
    return qb.getMany();
  }

  async distinctSources(companyId: string) {
    const rows = (await this.leads.manager.query(
      `SELECT DISTINCT "source" AS source FROM leads WHERE "companyId" = $1 AND "source" IS NOT NULL AND TRIM("source") <> '' ORDER BY 1 ASC`,
      [companyId],
    )) as { source: string }[];
    return rows.map((r) => r.source).filter(Boolean);
  }

  async stats(companyId: string) {
    const rows = await this.leads.find({
      where: { companyId },
      order: { createdAt: "DESC" },
    });
    return {
      total: rows.length,
      newCount: rows.filter((x) => x.status === SYSTEM_STATUS_NEW).length,
      assignedCount: rows.filter((x) => x.status === SYSTEM_STATUS_IN_PROGRESS)
        .length,
      qualifiedCount: rows.filter((x) => x.status === "qualified").length,
      latest: rows.slice(0, 5),
    };
  }

  get(id: string) {
    return this.leads.findOne({ where: { id } });
  }

  getByConversationId(conversationId: string) {
    return this.leads.findOne({ where: { conversationId } });
  }

  private async allowedStatusCodes(companyId: string) {
    const c = await this.companies.findOne({ where: { id: companyId } });
    return normalizeLeadStatuses(c?.leadStatuses).map((x) => x.code);
  }

  async updateStatus(id: string, status: string) {
    const lead = await this.leads.findOne({ where: { id } });
    if (!lead) throw new NotFoundException();
    const normalized = status.trim().toLowerCase();
    const allowed = await this.allowedStatusCodes(lead.companyId);
    if (!allowed.includes(normalized)) {
      throw new BadRequestException("Недопустимый статус для этой компании");
    }
    await this.leads.update({ id }, { status: normalized });
    return this.get(id);
  }

  async update(
    id: string,
    data: Partial<
      Lead & {
        details: Record<string, unknown>;
      }
    >,
  ) {
    const lead = await this.leads.findOne({ where: { id } });
    if (!lead) throw new NotFoundException();
    const patch: Partial<Lead> = {};
    if (typeof data.fullName === "string")
      patch.fullName = data.fullName.trim();
    if (typeof data.phone === "string") patch.phone = data.phone.trim();
    if (typeof data.need === "string") patch.need = data.need.trim();
    if (typeof data.email === "string" || data.email === null)
      patch.email = data.email;
    if (typeof data.source === "string" || data.source === null)
      patch.source = data.source;
    if (typeof data.budget === "string" || data.budget === null)
      patch.budget = data.budget;
    if (typeof data.comment === "string" || data.comment === null) {
      patch.comment = data.comment;
    }
    if (data.details && typeof data.details === "object") {
      patch.details = data.details;
    }
    if (typeof data.status === "string" && data.status.trim()) {
      const normalized = data.status.trim().toLowerCase();
      const allowed = await this.allowedStatusCodes(lead.companyId);
      if (!allowed.includes(normalized)) {
        throw new BadRequestException("Недопустимый статус для этой компании");
      }
      patch.status = normalized;
    }
    Object.assign(lead, patch);
    const saved = await this.leads.save(lead);
    return this.get(saved.id);
  }

  async createLead(payload: Partial<Lead>) {
    const status =
      payload.status && String(payload.status).trim()
        ? String(payload.status).trim().toLowerCase()
        : SYSTEM_STATUS_NEW;
    const allowed = await this.allowedStatusCodes(payload.companyId!);
    const safeStatus = allowed.includes(status) ? status : SYSTEM_STATUS_NEW;
    const lead = await this.leads.save(
      this.leads.create({ ...payload, status: safeStatus }),
    );
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
      {
        assignedManagerId: manager.id,
        status: SYSTEM_STATUS_IN_PROGRESS,
      },
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
