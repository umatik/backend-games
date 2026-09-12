import bcrypt from "bcrypt";
import type { PoolClient } from "pg";
import type { AuthenticationInterface } from "../repositories/authentication/authentication.interface.js";
import { JwtService } from "./jwt.service.js";

export type Database = {
  connect(): Promise<PoolClient>;
};

export class AuthenticationService {
  constructor(
    private authRepository: AuthenticationInterface,
    private jwtService: JwtService,
    private pool: Database,
  ) {}

  async login(email: string, password: string) {
    const client = await this.pool.connect();

    try {
      const user = await this.authRepository.findUserByEmail(client, email);

      if (!user) {
        await this.authRepository.logLogin(client, {
          userId: null,
          email,
          success: false,
          ipAddress: null,
          userAgent: null,
        });

        throw new Error("Invalid credentials");
      }

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

      if (!isPasswordValid) {
        await this.authRepository.logLogin(client, {
          userId: user.id,
          email,
          success: false,
          ipAddress: null,
          userAgent: null,
        });

        throw new Error("Invalid credentials");
      }

      await this.authRepository.logLogin(client, {
        userId: user.id,
        email,
        success: true,
        ipAddress: null,
        userAgent: null,
      });

      const token = this.jwtService.generateToken(user.id, user.email);

      return {
        user,
        token,
      };
    } finally {
      client.release();
    }
  }
}
