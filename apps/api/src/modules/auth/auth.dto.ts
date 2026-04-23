import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsOptional, IsString, MinLength } from "class-validator";

export class AuthCredentialsDto {
  @ApiProperty({ example: "owner@company.ru", description: "Email" })
  @IsEmail({}, { message: "Укажите корректную почту." })
  email: string;

  @ApiProperty({
    example: "password123",
    description: "Пароль, не короче 6 символов",
    minLength: 6,
  })
  @IsString({ message: "Введите пароль." })
  @MinLength(6, { message: "Пароль не короче 6 символов." })
  password: string;
}

export class UpdateProfileDto {
  @ApiPropertyOptional({
    description:
      "Числовой Telegram chat_id (можно получить командой /getMyInfo в подключённом боте). Пустая строка — сбросить.",
  })
  @IsOptional()
  @IsString()
  telegramChatId?: string;
}

export class VerifyEmailDto {
  @ApiProperty({ description: "Токен подтверждения из письма" })
  @IsString({ message: "Неверный токен подтверждения." })
  token: string;
}

export class EmailOnlyDto {
  @ApiProperty({ example: "owner@company.ru", description: "Email" })
  @IsEmail({}, { message: "Укажите корректную почту." })
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: "Токен восстановления из письма" })
  @IsString({ message: "Неверный токен восстановления." })
  token: string;

  @ApiProperty({
    example: "newStrongPassword123",
    description: "Новый пароль, не короче 6 символов",
    minLength: 6,
  })
  @IsString({ message: "Введите новый пароль." })
  @MinLength(6, { message: "Пароль не короче 6 символов." })
  password: string;
}
