import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { entities } from "./database/entities";
import { AuthModule } from "./modules/auth/auth.module";
import { CompaniesModule } from "./modules/companies/companies.module";
import { ManagersModule } from "./modules/managers/managers.module";
import { BotsModule } from "./modules/bots/bots.module";
import { LeadsModule } from "./modules/leads/leads.module";
import { BillingModule } from "./modules/billing/billing.module";
import { TelegramModule } from "./modules/telegram/telegram.module";
import { ConversationsModule } from "./modules/conversations/conversations.module";
import { HealthController } from "./modules/health/health.controller";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (c: ConfigService) => ({
        type: "postgres",
        url: c.get("DATABASE_URL"),
        entities,
        migrations: ["dist/database/migrations/*.js"],
        synchronize: false,
      }),
    }),
    AuthModule,
    CompaniesModule,
    ManagersModule,
    BotsModule,
    LeadsModule,
    BillingModule,
    TelegramModule,
    ConversationsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
