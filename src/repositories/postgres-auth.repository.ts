import type { AuthRepository, AuthUser } from "./auth.repository.js";
import type { PoolClient } from "pg";

export class PostgresAuthRepository implements AuthRepository {
  async findUserByEmail(
    client: PoolClient,
    email: string,
  ): Promise<AuthUser | null> {
    const result = await client.query<AuthUser>(
      `
        SELECT
          id,
          email,
          password_hash AS "passwordHash"
        FROM users
        WHERE email = $1
          AND is_deleted = FALSE
      `,
      [email],
    );

    return result.rows[0] ?? null;
  }

  async logLogin(
    client: PoolClient,
    data: {
      userId: string | null;
      email: string;
      success: boolean;
      ipAddress: string | null;
      userAgent: string | null;
    },
  ): Promise<void> {
    await client.query(
      `
      INSERT INTO login_logs (
        user_id,
        email,
        success,
        ip_address,
        user_agent
      )
      VALUES ($1, $2, $3, $4, $5)
    `,
      [data.userId, data.email, data.success, data.ipAddress, data.userAgent],
    );
  }
}
