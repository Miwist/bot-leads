import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Manager, User } from "../../database/entities";
import { ManagersController } from "./managers.controller";
import { ManagersService } from "./managers.service";
@Module({
  imports: [TypeOrmModule.forFeature([Manager, User])],
  controllers: [ManagersController],
  providers: [ManagersService],
  exports: [ManagersService],
})
export class ManagersModule {}
