import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  BotConnection,
  Conversation,
  ConversationMessage,
  Lead,
} from "../../database/entities";
import { ConversationsService } from "./conversations.service";
import { ConversationsController } from "./conversations.controller";
import { BotsModule } from "../bots/bots.module";
import { S3StorageService } from "../../common/s3-storage.service";
import { RabbitMqService } from "../../common/rabbitmq.service";
import { ConversationsReplyQueueConsumer } from "./conversations-reply-queue.consumer";

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      Conversation,
      Lead,
      ConversationMessage,
      BotConnection,
    ]),
    BotsModule,
  ],
  providers: [
    ConversationsService,
    S3StorageService,
    RabbitMqService,
    ConversationsReplyQueueConsumer,
  ],
  controllers: [ConversationsController],
})
export class ConversationsModule {}
