import type { PoolClient } from "pg";
import type { UserInterface } from "./user.interface.js";
import type {
  CreatedUser,
  CreateUserData,
  UpdateUserData,
  UserDetails,
} from "../../types/user.types.js";

export class UserPostgresRepository implements UserInterface {
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
        INSERT INTO users (email,
                           password_hash)
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
    const userFields: string[] = [];
    const userValues: unknown[] = [];

    if (data.email !== undefined) {
      userFields.push(`email = $${userValues.length + 1}`);
      userValues.push(data.email);
    }

    if (userFields.length > 0) {
      userValues.push(userId);

      await client.query(
        `
          UPDATE users
          SET ${userFields.join(", ")},
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $${userValues.length}
          AND is_deleted = FALSE
      `,
        userValues,
      );
    }

    const contactFields: string[] = [];
    const contactValues: unknown[] = [];

    const contactMapping: Record<string, string> = {
      firstName: "first_name",
      lastName: "last_name",
      phone: "phone",
      address: "address",
      city: "city",
      postalCode: "postal_code",
      country: "country",
    };

    for (const [inputField, column] of Object.entries(contactMapping)) {
      const value = data[inputField as keyof UpdateUserData];

      if (value !== undefined) {
        contactFields.push(`${column} = $${contactValues.length + 1}`);
        contactValues.push(value);
      }
    }

    if (contactFields.length > 0) {
      contactValues.push(userId);

      await client.query(
        `
          UPDATE user_contact_details
          SET ${contactFields.join(", ")},
              updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $${contactValues.length}
      `,
        contactValues,
      );
    }

    return this.findById(client, userId);
  }
}
