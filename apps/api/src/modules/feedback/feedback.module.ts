import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Company, FeedbackMessage } from "../../database/entities";
import { FeedbackController } from "./feedback.controller";
import { FeedbackService } from "./feedback.service";
import { S3StorageService } from "../../common/s3-storage.service";

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([FeedbackMessage, Company])],
  controllers: [FeedbackController],
  providers: [FeedbackService, S3StorageService],
})
export class FeedbackModule {}
