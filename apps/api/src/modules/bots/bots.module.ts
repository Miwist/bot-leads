import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BotConnection, Company } from "../../database/entities";
import { BotsService } from "./bots.service";
import { BotsController } from "./bots.controller";
import { EncryptionService } from "../../common/encryption.service";
@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([BotConnection, Company])],
  controllers: [BotsController],
  providers: [BotsService, EncryptionService],
  exports: [BotsService, EncryptionService],
})
export class BotsModule {}
