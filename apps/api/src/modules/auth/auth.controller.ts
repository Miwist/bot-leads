import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import {
  AuthCredentialsDto,
  EmailOnlyDto,
  ResetPasswordDto,
  UpdateProfileDto,
  VerifyEmailDto,
} from "./auth.dto";

@ApiTags("Авторизация")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("register")
  @ApiOperation({ summary: "Регистрация пользователя и компании" })
  register(@Body() dto: AuthCredentialsDto) {
    return this.auth.register(dto.email, dto.password);
  }

  @Post("login")
  @ApiOperation({ summary: "Вход, выдача JWT" })
  login(@Body() dto: AuthCredentialsDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @Post("verify-email")
  @ApiOperation({ summary: "Подтвердить email по токену из письма" })
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.auth.verifyEmail(dto.token);
  }

  @Post("resend-verification")
  @ApiOperation({ summary: "Повторно отправить письмо подтверждения" })
  resendVerification(@Body() dto: EmailOnlyDto) {
    return this.auth.resendVerification(dto.email);
  }

  @Post("forgot-password")
  @ApiOperation({ summary: "Запросить письмо для восстановления пароля" })
  forgotPassword(@Body() dto: EmailOnlyDto) {
    return this.auth.requestPasswordReset(dto.email);
  }

  @Post("reset-password")
  @ApiOperation({ summary: "Сбросить пароль по токену из письма" })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto.token, dto.password);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("JWT")
  @ApiOperation({ summary: "Текущий пользователь (профиль из БД)" })
  me(@Req() req: { user: { sub: string } }) {
    return this.auth.me(req.user.sub);
  }

  @Patch("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("JWT")
  @ApiOperation({ summary: "Обновить профиль (например Telegram ID)" })
  patchMe(
    @Req() req: { user: { sub: string } },
    @Body() dto: UpdateProfileDto,
  ) {
    return this.auth.updateProfile(req.user.sub, dto);
  }
}
