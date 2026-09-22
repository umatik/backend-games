import type {PoolClient} from "pg";
import type {
  CreatedUser,
  CreateUserData,
  UpdateUserData,
  UserDetails,
} from "../../types/user.types.js";

export interface UserInterface {
  createUser(client: PoolClient, data: CreateUserData): Promise<CreatedUser>;

  findById(client: PoolClient, userId: number): Promise<UserDetails | null>;

  findAll(client: PoolClient, page: number, limit: number): Promise<UserDetails[]>;

  update(
    client: PoolClient,
    userId: number,
    data: UpdateUserData,
  ): Promise<UserDetails | null>;

  countAll(client: PoolClient): Promise<number>;
}
