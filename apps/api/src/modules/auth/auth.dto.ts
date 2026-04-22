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
      "Числовой Telegram chat_id (например из @userinfobot). Пустая строка — сбросить.",
  })
  @IsOptional()
  @IsString()
  telegramChatId?: string;
}
