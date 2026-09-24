import type { PoolClient } from "pg";
import type { PasswordResetTokenInterface } from "@/repositories/password-reset-token/password-reset-token.interface.js";

export class PasswordResetTokenPostgresRepository implements PasswordResetTokenInterface {


  async create(
    client: PoolClient,
    userId: number,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await client.query(
      `
        INSERT INTO password_reset_tokens (
          user_id,
          token_hash,
          expires_at
        )
        VALUES ($1, $2, $3)
      `,
      [userId, tokenHash, expiresAt],
    );
  }

  async findValidToken(
    client: PoolClient,
    tokenHash: string,
  ): Promise<{ id: number; userId: number } | null> {
    const result = await client.query<{ id: number; userId: number }>(
      `
        SELECT id,
               user_id AS "userId"
        FROM password_reset_tokens
        WHERE token_hash = $1
          AND expires_at > NOW()
          AND used_at IS NULL
        LIMIT 1
      `,
      [tokenHash],
    );

    return result.rows[0] ?? null;
  }

  async markAsUsed(client: PoolClient, tokenId: number): Promise<void> {
    await client.query(
      `
        UPDATE password_reset_tokens
        SET used_at = NOW()
        WHERE id = $1
          AND used_at IS NULL
      `,
      [tokenId],
    );
  }
}
