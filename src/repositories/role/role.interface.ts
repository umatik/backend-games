import type {PoolClient} from "pg";

export interface RoleInterface {
  assignToUser(
    client: PoolClient,
    userId: number,
    roleName: string,
  ): Promise<void>;
}
