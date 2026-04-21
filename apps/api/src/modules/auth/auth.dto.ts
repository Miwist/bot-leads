import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MinLength } from "class-validator";

export class AuthCredentialsDto {
  @ApiProperty({ example: "owner@company.ru", description: "Email" })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: "password123",
    description: "Пароль, не короче 6 символов",
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  password: string;
}
