import type { PoolClient } from "pg";
import type { UserInterface } from "./user.interface.js";
import type { CreatedUser, CreateUserData } from "../../types/user.types.js";

export class UserPostgresRepository implements UserInterface {
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
