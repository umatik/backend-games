import type { PoolClient } from "pg";
import type {
  CreateUserData,
  CreateUserResult,
  UserRepository,
} from "./user.repository.js";

export class PostgresUserRepository implements UserRepository {
  async createUser(
    client: PoolClient,
    data: CreateUserData,
  ): Promise<CreateUserResult> {
    const result = await client.query<CreateUserResult>(
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
