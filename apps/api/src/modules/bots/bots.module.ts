import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BotConnection } from "../../database/entities";
import { BotsService } from "./bots.service";
import { BotsController } from "./bots.controller";
import { EncryptionService } from "../../common/encryption.service";
@Module({
  imports: [TypeOrmModule.forFeature([BotConnection])],
  controllers: [BotsController],
  providers: [BotsService, EncryptionService],
  exports: [BotsService, EncryptionService],
})
export class BotsModule {}
