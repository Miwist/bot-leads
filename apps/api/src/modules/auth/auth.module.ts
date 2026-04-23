import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { User } from "../../database/entities";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { MailerService } from "../../common/mailer.service";
import { AdminTelegramService } from "../../common/admin-telegram.service";
@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET ?? "dev-insecure-change-me",
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, MailerService, AdminTelegramService],
  exports: [AuthService],
})
export class AuthModule {}
