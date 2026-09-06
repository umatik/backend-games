import type { PoolClient } from "pg";
import type { UserRepository } from "./user.repository.js";
import type { CreateUserData, CreatedUser } from "../types/user.types.js";

export class PostgresUserRepository implements UserRepository {
  async createUser(
    client: PoolClient,
    data: CreateUserData,
  ): Promise<CreatedUser> {
    const result = await client.query<CreatedUser>(
      `
        INSERT INTO users (
          email,
          password_hash
        )
        VALUES ($1, $2)
        RETURNING
          id,
          email
      `,
      [data.email, data.passwordHash],
    );

    const user = result.rows[0];

    if (!user) {
      throw new Error("User was not created");
    }

    return user;
  }
}
