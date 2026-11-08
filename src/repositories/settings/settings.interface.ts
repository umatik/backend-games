import type { PoolClient } from "pg";

export type SettingRow = {
  key: string;
  value: unknown;
  encryptedValue: string | null;
  updatedBy: number | null;
  updatedByEmail: string | null;
  updatedAt: Date;
};

export type SettingWrite =
  | { key: string; value: unknown; encryptedValue?: never }
  | { key: string; encryptedValue: string; value?: never };

export interface SettingsRepository {
  findAll(client: PoolClient): Promise<SettingRow[]>;

  upsert(client: PoolClient, data: SettingWrite, userId: number | null): Promise<void>;

  delete(client: PoolClient, key: string): Promise<void>;
}
