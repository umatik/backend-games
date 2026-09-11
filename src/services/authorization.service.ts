import type { PermissionInterface } from "../repositories/permissions/permission.interface.js";
import { pool } from "../database/db.js";

export class AuthorizationService {
  constructor(private permissionRepository: PermissionInterface) {}

  async hasPermission(userId: number, permission: string): Promise<boolean> {
    const client = await pool.connect();

    try {
      const permissions = await this.permissionRepository.findByUserId(
        client,
        userId,
      );

      return permissions.includes(permission);
    } finally {
      client.release();
    }
  }
}
