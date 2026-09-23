import bcrypt from "bcrypt";
import type { AuthenticationInterface } from "../repositories/authentication/authentication.interface.js";
import { JwtService } from "./jwt.service.js";
import { InvalidCredentialsError } from "../errors/invalid-credentials.error.js";
import type { Database } from "../database/database.interface.js";

const DUMMY_PASSWORD_HASH =
  "$2b$12$LQv3c1yqBWxq6h7n6n1M5e9w8J7K6L5M4N3P2Q1R0S9T8U7V6W5X4";

export class AuthenticationService {
  constructor(
    private authRepository: AuthenticationInterface,
    private jwtService: JwtService,
    private pool: Database,
  ) {}

  async login(
    email: string,
    password: string,
    ipAddress: string | null = null,
    userAgent: string | null = null,
  ) {
    const client = await this.pool.connect();
    const fixedEmail = email.trim().toLowerCase();

    try {
      const user = await this.authRepository.findUserByEmail(
        client,
        fixedEmail,
      );
      const passwordHash = user?.passwordHash ?? DUMMY_PASSWORD_HASH;
      const isPasswordValid = await bcrypt.compare(password, passwordHash);

      if (!user) {
        await this.authRepository.logLogin(client, {
          userId: null,
          email: fixedEmail,
          success: false,
          ipAddress,
          userAgent,
        });

        throw new InvalidCredentialsError();
      }

      if (!isPasswordValid) {
        await this.authRepository.logLogin(client, {
          userId: user.id,
          email: fixedEmail,
          success: false,
          ipAddress,
          userAgent,
        });

        throw new InvalidCredentialsError();
      }

      await this.authRepository.logLogin(client, {
        userId: user.id,
        email: fixedEmail,
        success: true,
        ipAddress,
        userAgent,
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
