import type {PoolClient} from "pg";
import type {UserContactInterface} from "./user-contact.interface.js";
import type {
  CreateUserContactData,
  UpdateUserContactData,
  UserContactDetails,
} from "../../types/user.types.js";

export class UserContactPostgresRepository implements UserContactInterface {
  async createContact(
    client: PoolClient,
    data: CreateUserContactData,
  ): Promise<void> {
    await client.query(
      `
        INSERT INTO user_contact_details (user_id,
                                          first_name,
                                          last_name,
                                          phone,
                                          address,
                                          city,
                                          postal_code,
                                          country)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        data.userId,
        data.firstName,
        data.lastName,
        data.phone,
        data.address,
        data.city,
        data.postalCode,
        data.country,
      ],
    );
  }

  async update(
    client: PoolClient,
    userId: number,
    data: UpdateUserContactData,
  ): Promise<UserContactDetails | null> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.firstName !== undefined) {
      fields.push(`first_name = $${values.length + 1}`);
      values.push(data.firstName);
    }

    if (data.lastName !== undefined) {
      fields.push(`last_name = $${values.length + 1}`);
      values.push(data.lastName);
    }

    if (data.phone !== undefined) {
      fields.push(`phone = $${values.length + 1}`);
      values.push(data.phone);
    }

    if (data.address !== undefined) {
      fields.push(`address = $${values.length + 1}`);
      values.push(data.address);
    }

    if (data.city !== undefined) {
      fields.push(`city = $${values.length + 1}`);
      values.push(data.city);
    }

    if (data.postalCode !== undefined) {
      fields.push(`postal_code = $${values.length + 1}`);
      values.push(data.postalCode);
    }

    if (data.country !== undefined) {
      fields.push(`country = $${values.length + 1}`);
      values.push(data.country);
    }

    if (fields.length === 0) {
      return null;
    }

    fields.push("updated_at = CURRENT_TIMESTAMP");

    values.push(userId);

    const result = await client.query<UserContactDetails>(
      `
        UPDATE user_contact_details
        SET ${fields.join(", ")}
        WHERE user_id = $${values.length}
          RETURNING
            user_id AS "userId",
            first_name AS "firstName",
            last_name AS "lastName",
            phone,
            address,
            city,
            postal_code AS "postalCode",
            country;
    `,
      values,
    );

    return result.rows[0] ?? null;
  }

}
