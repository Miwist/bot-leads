import { Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "../../database/entities";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    private jwt: JwtService,
  ) {}
  async register(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const u = this.users.create({
      email: normalizedEmail,
      passwordHash: await bcrypt.hash(password, 10),
    });
    await this.users.save(u);
    return {
      token: this.jwt.sign({
        sub: u.id,
        email: u.email,
        companyId: u.companyId,
        role: u.role,
      }),
    };
  }
  async login(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const u = await this.users.findOne({ where: { email: normalizedEmail } });
    if (!u || !(await bcrypt.compare(password, u.passwordHash)))
      throw new UnauthorizedException();
    return {
      token: this.jwt.sign({
        sub: u.id,
        email: u.email,
        companyId: u.companyId,
        role: u.role,
      }),
    };
  }
}
