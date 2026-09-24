import type { PoolClient } from "pg";
import type { UserInterface } from "@/repositories/user/user.interface.js";
import type {
  CreatedUser,
  CreateUserData,
  UpdateUserData,
  UserDetails,
} from "../../types/user.types.js";

export class UserPostgresRepository implements UserInterface {
  async findByEmail(
    client: PoolClient,
    email: string,
  ): Promise<CreatedUser | null> {
    const result = await client.query<CreatedUser>(
      `
      SELECT id,
             email,
             password_hash AS "passwordHash"
      FROM users
      WHERE email = $1
        AND is_deleted = FALSE
    `,
      [email],
    );

    return result.rows[0] ?? null;
  }

  async countAll(client: PoolClient): Promise<number> {
    const result = await client.query(
      `
        SELECT COUNT(*) AS total
        FROM users
        WHERE is_deleted = FALSE
      `,
    );

    return Number(result.rows[0].total);
  }

  async findAll(
    client: PoolClient,
    page: number,
    limit: number,
  ): Promise<UserDetails[]> {
    const offset = (page - 1) * limit;

    const result = await client.query<UserDetails>(
      `
        SELECT u.id,
               u.email,
               ucd.first_name  AS "firstName",
               ucd.last_name   AS "lastName",
               ucd.phone,
               ucd.address,
               ucd.city,
               ucd.postal_code AS "postalCode",
               ucd.country
        FROM users u
               JOIN user_contact_details ucd
                    ON ucd.user_id = u.id
        WHERE u.is_deleted = FALSE
        ORDER BY u.id
        LIMIT $1 OFFSET $2
      `,
      [limit, offset],
    );

    return result.rows;
  }

  async findById(
    client: PoolClient,
    userId: number,
  ): Promise<UserDetails | null> {
    const result = await client.query<UserDetails>(
      `
        SELECT u.id,
               u.email,
               ucd.first_name  AS "firstName",
               ucd.last_name   AS "lastName",
               ucd.phone,
               ucd.address,
               ucd.city,
               ucd.postal_code AS "postalCode",
               ucd.country
        FROM users u
               JOIN user_contact_details ucd
                    ON ucd.user_id = u.id
        WHERE u.id = $1
          AND u.is_deleted = FALSE
      `,
      [userId],
    );

    return result.rows[0] ?? null;
  }

  async createUser(
    client: PoolClient,
    data: CreateUserData,
  ): Promise<CreatedUser> {
    const result = await client.query<CreatedUser>(
      `
        INSERT INTO users (email, password_hash)
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

  async update(
    client: PoolClient,
    userId: number,
    data: UpdateUserData,
  ): Promise<UserDetails | null> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.email !== undefined) {
      fields.push(`email = $${values.length + 1}`);
      values.push(data.email);
    }

    if (data.password !== undefined) {
      fields.push(`password_hash = $${values.length + 1}`);
      values.push(data.password);
    }

    if (fields.length === 0) {
      return this.findById(client, userId);
    }

    fields.push("updated_at = CURRENT_TIMESTAMP");

    values.push(userId);

    const result = await client.query(
      `UPDATE users
       SET ${fields.join(", ")}
       WHERE id = $${values.length}
          AND is_deleted = FALSE
      RETURNING id
    `,
      values,
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.findById(client, userId);
  }

  async resetPassword(
    client: PoolClient,
    userId: number,
    passwordHash: string,
  ): Promise<boolean> {
    const result = await client.query(
      `
      UPDATE users
      SET password_hash = $1,
          updated_at    = CURRENT_TIMESTAMP
      WHERE id = $2
        AND is_deleted = FALSE
      RETURNING id;`,
      [passwordHash, userId],
    );

    return result.rowCount === 1;
  }
}
