import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Conversation, Lead } from "../../database/entities";
import { ConversationsService } from "./conversations.service";
import { ConversationsController } from "./conversations.controller";

@Module({
  imports: [TypeOrmModule.forFeature([Conversation, Lead])],
  providers: [ConversationsService],
  controllers: [ConversationsController],
})
export class ConversationsModule {}
