import crypto from "node:crypto";
import type { Database } from "@/database/database.interface.js";
import type { PasswordResetTokenInterface } from "@/repositories/password-reset-token/password-reset-token.interface.js";
import type { UserInterface } from "@/repositories/user/user.interface.js";
import bcrypt from "bcrypt";
import type { EmailService } from "@/services/email.service.js";

const DUMMY_PASSWORD_HASH =
  "$2b$12$LQv3c1yqBWxq6h7n6n1M5e9w8J7K6L5M4N3P2Q1R0S9T8U7V6W5X4";

export class PasswordResetService {
  constructor(
    private userRepository: UserInterface,
    private passwordResetTokenRepository: PasswordResetTokenInterface,
    private pool: Database,
    private emailService: EmailService,
  ) {}

  async forgotPassword(email: string): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const user = await this.userRepository.findByEmail(client, email);

      if (!user) {
        await bcrypt.compare("dummy-password", DUMMY_PASSWORD_HASH);
        await client.query("COMMIT");

        return;
      }

      const token = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await this.passwordResetTokenRepository.create(
        client,
        user.id,
        tokenHash,
        expiresAt,
      );

      await client.query("COMMIT");

      await this.emailService.sendPasswordResetEmail(user.email, token);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

      const resetToken = await this.passwordResetTokenRepository.findValidToken(
        client,
        tokenHash,
      );

      if (!resetToken) {
        await client.query("ROLLBACK");
        return false;
      }

      const passwordHash = await bcrypt.hash(newPassword, 12);

      const updated = await this.userRepository.resetPassword(
        client,
        resetToken.userId,
        passwordHash,
      );

      if (!updated) {
        await client.query("ROLLBACK");
        return false;
      }

      await this.passwordResetTokenRepository.markAsUsed(client, resetToken.id);

      await client.query("COMMIT");

      return true;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
