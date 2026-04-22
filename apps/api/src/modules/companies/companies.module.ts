import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Company, User } from "../../database/entities";
import { CompaniesController } from "./companies.controller";
import { CompaniesService } from "./companies.service";
import { S3StorageService } from "../../common/s3-storage.service";
import { AiModule } from "../ai/ai.module";
import { CompanyAssistantController } from "./company-assistant.controller";
@Module({
  imports: [ConfigModule, AiModule, TypeOrmModule.forFeature([Company, User])],
  controllers: [CompaniesController, CompanyAssistantController],
  providers: [CompaniesService, S3StorageService],
  exports: [CompaniesService],
})
export class CompaniesModule {}
