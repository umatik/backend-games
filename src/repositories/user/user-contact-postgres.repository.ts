import type { PoolClient } from "pg";
import type { UserContactInterface } from "./user-contact.interface.js";
import type { CreateUserContactData } from "../../types/user.types.js";

export class UserContactPostgresRepository implements UserContactInterface {
  async createContact(
    client: PoolClient,
    data: CreateUserContactData,
  ): Promise<void> {
    await client.query(
      `
        INSERT INTO user_contact_details (
          user_id,
          first_name,
          last_name,
          phone,
          address,
          city,
          postal_code,
          country
        )
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
}
