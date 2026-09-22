import type {PoolClient} from "pg";

export interface PermissionInterface {
  findByUserId(client: PoolClient, userId: number): Promise<string[]>;

  hasRole(client: PoolClient, userId: number, role: string): Promise<boolean>;
}