import type {PoolClient} from "pg";
import type {RoleInterface} from "@/repositories/role/role.interface.js";

export class RolePostgresRepository implements RoleInterface {
  async assignToUser(
    client: PoolClient,
    userId: number,
    roleName: string,
  ): Promise<void> {
    const roleResult = await client.query<{id: number}>(
      `
        SELECT id
        FROM roles
        WHERE name = $1
      `,
      [roleName],
    );

    const role = roleResult.rows[0];

    if (!role) {
      throw new Error(`Role not found: ${roleName}`);
    }

    await client.query(
      `
        INSERT INTO user_roles (user_id, role_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, role_id) DO NOTHING
      `,
      [userId, role.id],
    );
  }
}
