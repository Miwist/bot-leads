import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { RabbitMqService } from "../../common/rabbitmq.service";
import { logInfo, logWarn } from "../../common/logging";
import { ConversationsService } from "./conversations.service";

@Injectable()
export class ConversationsReplyQueueConsumer implements OnModuleInit {
  private readonly log = new Logger(ConversationsReplyQueueConsumer.name);

  constructor(
    private readonly rabbit: RabbitMqService,
    private readonly conversations: ConversationsService,
  ) {}

  async onModuleInit() {
    if (!this.rabbit.isEnabled()) {
      logWarn(this.log, "chat_reply_queue_disabled");
      return;
    }
    const queue = this.rabbit.getConversationReplyQueue();
    const subscribed = await this.rabbit.subscribe(queue, async (payload) => {
      await this.conversations.processReplyJob(
        payload as {
          companyId: string;
          conversationId: string;
          text: string;
          attachments: Array<{ name?: string; data?: string }>;
          requestedByRole?: string;
          requestedByCompanyId?: string | null;
        },
      );
    });
    if (subscribed) {
      logInfo(this.log, "chat_reply_queue_ready", { queue });
    }
  }
}
