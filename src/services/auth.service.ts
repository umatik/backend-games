import bcrypt from "bcrypt";
import type { AuthRepository } from "../repositories/auth.repository.js";
import { pool } from "../database/db.js";

export class AuthService {
  constructor(private authRepository: AuthRepository) {}

  async login(email: string, password: string) {
    const client = await pool.connect();

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

      return user;
    } finally {
      client.release();
    }
  }
}
