import type { PoolClient } from "pg";

export interface PasswordResetTokenInterface {
  create(
    client: PoolClient,
    userId: number,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void>;

  findValidToken(
    client: PoolClient,
    tokenHash: string,
  ): Promise<{
    id: number;
    userId: number;
  } | null>;

  markAsUsed(client: PoolClient, tokenId: number): Promise<void>;


}
