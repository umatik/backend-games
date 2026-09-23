import type { PoolClient } from "pg";

export interface Database {
  connect(): Promise<PoolClient>;
}
