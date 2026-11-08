import type { PoolClient } from "pg";
import type {
  SettingRow,
  SettingsRepository,
  SettingWrite,
} from "./settings.interface.js";

export class SettingsPostgresRepository implements SettingsRepository {
  async findAll(client: PoolClient): Promise<SettingRow[]> {
    const result = await client.query<SettingRow>(
      `
        SELECT s.key,
               s.value,
               s.encrypted_value AS "encryptedValue",
               s.updated_by      AS "updatedBy",
               u.email           AS "updatedByEmail",
               s.updated_at      AS "updatedAt"
        FROM settings s
               LEFT JOIN users u ON u.id = s.updated_by
      `,
    );

    return result.rows.map((row) => ({
      ...row,
      updatedBy: row.updatedBy === null ? null : Number(row.updatedBy),
    }));
  }

  async upsert(
    client: PoolClient,
    data: SettingWrite,
    userId: number | null,
  ): Promise<void> {
    await client.query(
      `
        INSERT INTO settings (key, value, encrypted_value, updated_by, updated_at)
        VALUES ($1, $2::jsonb, $3, $4, NOW())
        ON CONFLICT (key) DO UPDATE
          SET value           = EXCLUDED.value,
              encrypted_value = EXCLUDED.encrypted_value,
              updated_by      = EXCLUDED.updated_by,
              updated_at      = NOW()
      `,
      [
        data.key,
        data.encryptedValue === undefined ? JSON.stringify(data.value) : null,
        data.encryptedValue ?? null,
        userId,
      ],
    );
  }

  async delete(client: PoolClient, key: string): Promise<void> {
    await client.query("DELETE FROM settings WHERE key = $1", [key]);
  }
}
