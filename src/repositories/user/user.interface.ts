import type { PoolClient } from "pg";
import type {
  CreatedUser,
  CreateUserData,
  UpdateUserData,
  UserDetails,
} from "../../types/user.types.js";

export interface UserInterface {
  createUser(client: PoolClient, data: CreateUserData): Promise<CreatedUser>;

  findById(client: PoolClient, userId: number): Promise<UserDetails | null>;

  update(
    client: PoolClient,
    userId: number,
    data: UpdateUserData,
  ): Promise<UserDetails | null>;
}
