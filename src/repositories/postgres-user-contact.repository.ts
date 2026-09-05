import type { PoolClient } from "pg";
import type {
  CreateUserContactData,
  UserContactRepository,
} from "./user-contact.repository.js";

export class PostgresUserContactRepository implements UserContactRepository {
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
