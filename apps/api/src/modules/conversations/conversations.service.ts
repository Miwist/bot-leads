import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Conversation, Lead } from "../../database/entities";
import { Repository } from "typeorm";

@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(Conversation) private convRepo: Repository<Conversation>,
    @InjectRepository(Lead) private leadsRepo: Repository<Lead>,
  ) {}

  async list(companyId: string) {
    const conversations = await this.convRepo.find({
      where: { companyId },
      order: { createdAt: "DESC" },
    });
    const leads = await this.leadsRepo.find({ where: { companyId } });

    return conversations.map((conversation) => {
      const lead = leads.find((item) => item.conversationId === conversation.id);
      const context = (conversation.context || {}) as Record<string, unknown>;
      const timeline = [
        { role: "assistant", text: "Здравствуйте! Как вас зовут?" },
        ...(context.name ? [{ role: "user", text: String(context.name) }] : []),
        ...(context.phone
          ? [
              { role: "assistant", text: "Введите телефон" },
              { role: "user", text: String(context.phone) },
            ]
          : []),
        ...(lead?.need
          ? [
              { role: "assistant", text: "Что вам нужно?" },
              { role: "user", text: lead.need },
            ]
          : []),
      ];

      return {
        id: conversation.id,
        telegramUserId: conversation.telegramUserId,
        createdAt: conversation.createdAt,
        state: conversation.state,
        lead,
        preview:
          lead?.need || String(context.name || "Новый диалог без полной квалификации"),
        timeline,
      };
    });
  }
}
