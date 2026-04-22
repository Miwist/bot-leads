import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Company, User } from "../../database/entities";
import { Repository } from "typeorm";
import { normalizeLeadStatuses } from "../../common/lead-statuses";
import { S3StorageService } from "../../common/s3-storage.service";

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company) private repo: Repository<Company>,
    @InjectRepository(User) private users: Repository<User>,
    private storage: S3StorageService,
  ) {}

  private buildSlug(name?: string) {
    return (
      name
        ?.toLowerCase()
        .trim()
        .replace(/[^a-zа-я0-9]+/gi, "-")
        .replace(/^-+|-+$/g, "") || `company-${Date.now()}`
    );
  }

  private async ensureUniqueSlug(baseSlug: string) {
    let slug = baseSlug || `company-${Date.now()}`;
    let index = 1;
    while (await this.repo.findOne({ where: { slug } })) {
      slug = `${baseSlug}-${index}`;
      index += 1;
    }
    return slug;
  }

  private withLeadStatuses(c: Company | null) {
    if (!c) return null;
    return {
      ...c,
      leadStatuses: normalizeLeadStatuses(c.leadStatuses),
    };
  }

  async resolveCompanyId(user: {
    sub?: string;
    companyId?: string | null;
    role?: string;
  }): Promise<string | null> {
    if (user.role === "admin") {
      return null;
    }
    if (user.sub) {
      const row = await this.users.findOne({
        where: { id: user.sub },
        select: { companyId: true },
      });
      if (row?.companyId) {
        return row.companyId;
      }
    }
    return user.companyId ?? null;
  }

  private async normalizeBotMaterials(
    companyId: string,
    rows: unknown,
  ): Promise<Company["botMaterials"]> {
    if (!Array.isArray(rows)) return [];
    const out: Company["botMaterials"] = [];
    for (const row of rows) {
      if (!row || typeof row !== "object") continue;
      const item = row as Record<string, unknown>;
      const id =
        String(item.id || "").trim() ||
        `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const title = String(item.title || "").trim() || "Материал";
      const fileName =
        String(item.fileName || item.name || "").trim() || "file";
      const kind = String(item.kind || "auto").trim() || "auto";
      const groupIdRaw = String(item.groupId || "").trim();
      const groupId = groupIdRaw || null;
      const rawUrl = String(item.url || "").trim();
      const rawData = String(item.data || "").trim();
      let url = rawUrl;
      let key = String(item.key || "").trim() || undefined;
      let mime = String(item.mime || "").trim() || "application/octet-stream";
      if (rawData && rawData.startsWith("data:")) {
        const uploaded = await this.storage.uploadDataUrl(rawData, {
          prefix: `companies/${companyId}/materials`,
          fileName,
        });
        if (uploaded) {
          url = uploaded.url;
          key = uploaded.key;
          mime = uploaded.mime;
        }
      }
      // В БД мог остаться data: URL без повторной отправки `data` — Telegram так не принимает
      if (url.startsWith("data:")) {
        const uploaded = await this.storage.uploadDataUrl(url, {
          prefix: `companies/${companyId}/materials`,
          fileName,
        });
        if (!uploaded) continue;
        url = uploaded.url;
        key = uploaded.key;
        mime = uploaded.mime;
      }
      if (!url) continue;
      out.push({
        id,
        title,
        fileName,
        mime,
        kind,
        url,
        key,
        groupId,
      });
    }
    return out;
  }

  async create(userId: string, data: Partial<Company>) {
    const slug = await this.ensureUniqueSlug(
      this.buildSlug((data as { slug?: string }).slug || data.name),
    );
    const leadStatuses =
      data.leadStatuses !== undefined
        ? normalizeLeadStatuses(data.leadStatuses)
        : normalizeLeadStatuses([]);
    const company = await this.repo.save(
      this.repo.create({
        ...data,
        slug,
        leadStatuses: leadStatuses as Company["leadStatuses"],
      }),
    );
    if (data.botMaterials !== undefined) {
      company.botMaterials = await this.normalizeBotMaterials(
        company.id,
        data.botMaterials,
      );
      await this.repo.save(company);
    }
    await this.users.update({ id: userId }, { companyId: company.id });
    return this.withLeadStatuses(company);
  }

  async list(user: { sub?: string; companyId?: string | null; role?: string }) {
    if (user.role === "admin") {
      return this.repo.find({ order: { createdAt: "DESC" } });
    }
    const companyId = await this.resolveCompanyId(user);
    if (!companyId) {
      return [];
    }
    return this.repo.find({
      where: { id: companyId },
      order: { createdAt: "DESC" },
    });
  }

  async get(
    id: string,
    user: { sub?: string; companyId?: string | null; role?: string },
  ) {
    if (user.role !== "admin") {
      const cid = await this.resolveCompanyId(user);
      if (!cid || cid !== id) {
        throw new ForbiddenException("Нет доступа к этой компании");
      }
    }
    const row = await this.repo.findOne({ where: { id } });
    return this.withLeadStatuses(row);
  }

  async update(
    id: string,
    data: Partial<Company>,
    user: { sub?: string; companyId?: string | null; role?: string },
  ) {
    if (user.role !== "admin") {
      const cid = await this.resolveCompanyId(user);
      if (!cid || cid !== id) {
        throw new ForbiddenException("Нет доступа к этой компании");
      }
    }
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException();
    const patch = { ...data } as Partial<Company> & { leadStatuses?: unknown };
    if (patch.leadStatuses !== undefined) {
      row.leadStatuses = normalizeLeadStatuses(
        patch.leadStatuses,
      ) as Company["leadStatuses"];
      delete patch.leadStatuses;
    }
    if (patch.botMaterials !== undefined) {
      row.botMaterials = await this.normalizeBotMaterials(
        row.id,
        patch.botMaterials,
      );
      delete patch.botMaterials;
    }
    Object.assign(row, patch);
    const saved = await this.repo.save(row);
    return this.withLeadStatuses(saved);
  }

  async removeBotMaterial(
    id: string,
    materialId: string,
    user: { sub?: string; companyId?: string | null; role?: string },
  ) {
    if (user.role !== "admin") {
      const cid = await this.resolveCompanyId(user);
      if (!cid || cid !== id) {
        throw new ForbiddenException("Нет доступа к этой компании");
      }
    }
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException();
    const materials = Array.isArray(row.botMaterials) ? row.botMaterials : [];
    const item = materials.find((x) => x.id === materialId);
    if (!item) return { ok: false };
    if (item.url) {
      await this.storage.deleteByUrl(item.url).catch(() => null);
    }
    row.botMaterials = materials.filter((x) => x.id !== materialId);
    await this.repo.save(row);
    return { ok: true };
  }
}
