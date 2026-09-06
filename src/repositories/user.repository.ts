import type { PoolClient } from "pg";
import type { CreatedUser, CreateUserData } from "../types/user.types.js";

export interface UserRepository {
  createUser(client: PoolClient, data: CreateUserData): Promise<CreatedUser>;
}
