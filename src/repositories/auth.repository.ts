import type { PoolClient } from "pg";

export type AuthUser = {
  id: string;
  email: string;
  passwordHash: string;
};

export interface AuthRepository {
  findUserByEmail(client: PoolClient, email: string): Promise<AuthUser | null>;

  logLogin(
    client: PoolClient,
    data: {
      userId: string | null;
      email: string;
      success: boolean;
      ipAddress: string | null;
      userAgent: string | null;
    },
  ): Promise<void>;
}
