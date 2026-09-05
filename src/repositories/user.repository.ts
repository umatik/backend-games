import type { PoolClient } from "pg";

export type CreateUserData = {
  email: string;
  passwordHash: string;
};

export type CreateUserResult = {
  id: string;
  email: string;
};

export interface UserRepository {
  createUser(
    client: PoolClient,
    data: CreateUserData,
  ): Promise<CreateUserResult>;
}
