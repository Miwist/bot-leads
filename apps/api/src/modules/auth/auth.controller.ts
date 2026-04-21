import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { AuthCredentialsDto } from "./auth.dto";

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

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("JWT")
  @ApiOperation({ summary: "Текущий пользователь по JWT" })
  me(@Req() req: { user: unknown }) {
    return req.user;
  }
}
