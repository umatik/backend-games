import type {PoolClient} from "pg";
import type {PermissionInterface} from "./permission.interface.js";

export class PermissionPostgresRepository implements PermissionInterface {
  async findByUserId(client: PoolClient, userId: number): Promise<string[]> {
    const result = await client.query<{ name: string }>(
      `
        SELECT DISTINCT p.name
        FROM permissions p
               JOIN role_permissions rp
                    ON rp.permission_id = p.id
               JOIN user_roles ur
                    ON ur.role_id = rp.role_id
        WHERE ur.user_id = $1
      `,
      [userId],
    );

    return result.rows.map((row) => row.name);
  }

  async hasRole(
    client: PoolClient,
    userId: number,
    role: string,
  ): Promise<boolean> {
    const result = await client.query<{ exists: boolean }>(
      `
        SELECT EXISTS (SELECT 1
                       FROM user_roles ur
                              JOIN roles r
                                   ON r.id = ur.role_id
                       WHERE ur.user_id = $1
                         AND r.name = $2) AS exists
      `,
      [userId, role],
    );

    return result.rows[0]?.exists ?? false;
  }
}