import type { PermissionInterface } from "@/repositories/permissions/permission.interface.js";
import type { Database } from "@/database/database.interface.js";

export class AuthorizationService {
  constructor(
    private permissionRepository: PermissionInterface,
    private pool: Database,
  ) {}

  async hasPermission(userId: number, permission: string): Promise<boolean> {
    const client = await this.pool.connect();

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

  async hasRole(userId: number, role: string): Promise<boolean> {
    const client = await this.pool.connect();

    try {
      return await this.permissionRepository.hasRole(client, userId, role);
    } finally {
      client.release();
    }
  }
}
