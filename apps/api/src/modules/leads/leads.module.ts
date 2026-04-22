import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Company, Lead, LeadAssignment } from "../../database/entities";
import { LeadsController } from "./leads.controller";
import { LeadsService } from "./leads.service";
import { ManagersModule } from "../managers/managers.module";
@Module({
  imports: [
    TypeOrmModule.forFeature([Lead, LeadAssignment, Company]),
    ManagersModule,
  ],
  controllers: [LeadsController],
  providers: [LeadsService],
  exports: [LeadsService],
})
export class LeadsModule {}
