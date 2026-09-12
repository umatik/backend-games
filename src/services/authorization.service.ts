import type { PermissionInterface } from "../repositories/permissions/permission.interface.js";
import type { PoolClient } from "pg";

export type Database = {
  connect(): Promise<PoolClient>;
};

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
}
