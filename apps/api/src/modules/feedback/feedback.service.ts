import { ForbiddenException, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Company, FeedbackMessage } from "../../database/entities";
import { Repository } from "typeorm";
import { S3StorageService } from "../../common/s3-storage.service";
import { logInfo } from "../../common/logging";

@Injectable()
export class FeedbackService {
  private readonly log = new Logger(FeedbackService.name);
  constructor(
    @InjectRepository(FeedbackMessage)
    private feedback: Repository<FeedbackMessage>,
    @InjectRepository(Company) private companies: Repository<Company>,
    private storage: S3StorageService,
  ) {}

  private assertCompanyAccess(
    user: { role?: string; companyId?: string | null },
    companyId: string,
  ) {
    if (user.role === "admin") return;
    if (!user.companyId || user.companyId !== companyId) {
      throw new ForbiddenException("Нет доступа");
    }
  }

  async listMessages(
    user: { role?: string; companyId?: string | null },
    companyId: string,
    topic?: string,
  ) {
    this.assertCompanyAccess(user, companyId);
    return this.feedback.find({
      where: { companyId, ...(topic ? { topic } : {}) },
      order: { createdAt: "ASC" },
      take: 200,
    });
  }

  async listTopics(
    user: { role?: string; companyId?: string | null },
    companyId: string,
  ) {
    this.assertCompanyAccess(user, companyId);
    const rows = await this.feedback.find({
      where: { companyId },
      order: { createdAt: "DESC" },
      take: 500,
    });
    const seen = new Set<string>();
    const out: Array<{ topic: string; lastMessage: string; lastMessageAt: Date | null }> = [];
    for (const row of rows) {
      const topic = (row.topic || "Общий вопрос").trim() || "Общий вопрос";
      if (seen.has(topic)) continue;
      seen.add(topic);
      out.push({
        topic,
        lastMessage: row.text || "",
        lastMessageAt: row.createdAt || null,
      });
    }
    if (!out.length) {
      out.push({
        topic: "Общий вопрос",
        lastMessage: "",
        lastMessageAt: null,
      });
    }
    return out;
  }

  async createCompanyMessage(
    user: { sub?: string; role?: string; companyId?: string | null },
    body: {
      companyId: string;
      text: string;
      attachments?: Array<{ name?: string; data?: string }>;
      topic?: string;
      attachmentName?: string;
      attachmentData?: string;
    },
  ) {
    this.assertCompanyAccess(user, body.companyId);
    const normalizedAttachmentsRaw = Array.isArray(body.attachments)
      ? body.attachments
          .filter((x) => x && (x.data || x.name))
          .slice(0, 10)
          .map((x) => ({
            name: String(x.name || "").trim() || "Файл",
            data: String(x.data || "").trim(),
          }))
      : body.attachmentData
        ? [
            {
              name: body.attachmentName?.trim() || "Файл",
              data: body.attachmentData.trim(),
            },
          ]
        : [];
    const normalizedAttachments: Array<{ name?: string; data?: string }> = [];
    for (const item of normalizedAttachmentsRaw) {
      const raw = String(item.data || "");
      if (!raw) continue;
      const uploaded = await this.storage.uploadDataUrl(raw, {
        prefix: `companies/${body.companyId}/support`,
        fileName: item.name || "file",
      });
      normalizedAttachments.push({
        name: item.name,
        data: uploaded?.url || raw,
      });
    }
    const saved = await this.feedback.save(
      this.feedback.create({
        companyId: body.companyId,
        topic: (body.topic || "Общий вопрос").trim() || "Общий вопрос",
        senderRole: "company",
        senderUserId: user.sub || null,
        text: body.text.trim() || "Прикреплён файл",
        attachments: normalizedAttachments,
        attachmentName: body.attachmentName?.trim() || null,
        attachmentData: body.attachmentData?.trim() || null,
      }),
    );
    logInfo(this.log, "support_message_created", {
      companyId: body.companyId,
      topic: (body.topic || "Общий вопрос").trim() || "Общий вопрос",
      senderRole: "company",
      attachmentsCount: normalizedAttachments.length,
    });
    return saved;
  }

  async listAdminThreads(user: { role?: string }) {
    if (user.role !== "admin") {
      throw new ForbiddenException("Только для администратора");
    }
    const companies = await this.companies.find({ order: { name: "ASC" } });
    const result: Array<{
      companyId: string;
      companyName: string;
      lastMessage: string;
      lastMessageAt: Date | null;
      hasUnreadForAdmin: boolean;
    }> = [];
    for (const c of companies) {
      const messages = await this.feedback.find({
        where: { companyId: c.id },
        order: { createdAt: "DESC" },
        take: 1,
      });
      const last = messages[0];
      result.push({
        companyId: c.id,
        companyName: c.name,
        lastMessage: last?.text || "",
        lastMessageAt: last?.createdAt || null,
        hasUnreadForAdmin: last?.senderRole === "company",
      });
    }
    return result;
  }

  async createAdminReply(
    user: { sub?: string; role?: string },
    body: {
      companyId: string;
      text: string;
      attachments?: Array<{ name?: string; data?: string }>;
      topic?: string;
      attachmentName?: string;
      attachmentData?: string;
    },
  ) {
    if (user.role !== "admin") {
      throw new ForbiddenException("Только для администратора");
    }
    const normalizedAttachmentsRaw = Array.isArray(body.attachments)
      ? body.attachments
          .filter((x) => x && (x.data || x.name))
          .slice(0, 10)
          .map((x) => ({
            name: String(x.name || "").trim() || "Файл",
            data: String(x.data || "").trim(),
          }))
      : body.attachmentData
        ? [
            {
              name: body.attachmentName?.trim() || "Файл",
              data: body.attachmentData.trim(),
            },
          ]
        : [];
    const normalizedAttachments: Array<{ name?: string; data?: string }> = [];
    for (const item of normalizedAttachmentsRaw) {
      const raw = String(item.data || "");
      if (!raw) continue;
      const uploaded = await this.storage.uploadDataUrl(raw, {
        prefix: `companies/${body.companyId}/support`,
        fileName: item.name || "file",
      });
      normalizedAttachments.push({
        name: item.name,
        data: uploaded?.url || raw,
      });
    }
    const saved = await this.feedback.save(
      this.feedback.create({
        companyId: body.companyId,
        topic: (body.topic || "Общий вопрос").trim() || "Общий вопрос",
        senderRole: "admin",
        senderUserId: user.sub || null,
        text: body.text.trim() || "Прикреплён файл",
        attachments: normalizedAttachments,
        attachmentName: body.attachmentName?.trim() || null,
        attachmentData: body.attachmentData?.trim() || null,
      }),
    );
    logInfo(this.log, "support_message_created", {
      companyId: body.companyId,
      topic: (body.topic || "Общий вопрос").trim() || "Общий вопрос",
      senderRole: "admin",
      attachmentsCount: normalizedAttachments.length,
    });
    return saved;
  }
}
