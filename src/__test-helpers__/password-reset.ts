import crypto from "node:crypto";
import { pool } from "../database/db.js";

export const createPasswordResetToken = async (
  userId: number,
): Promise<string> => {
  const token = crypto.randomBytes(32).toString("hex");

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await pool.query(
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

  return token;
};
