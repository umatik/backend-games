import type { PoolClient } from "pg";
import type {
  PendingUpload,
  PendingUploadRepository,
} from "./pending-upload.interface.js";

const COLUMNS = `
  id,
  path,
  content_type AS "contentType",
  created_by   AS "createdBy",
  created_at   AS "createdAt"
`;

const mapRow = (row: PendingUpload): PendingUpload => ({
  ...row,
  createdBy: row.createdBy === null ? null : Number(row.createdBy),
});

export class PendingUploadPostgresRepository implements PendingUploadRepository {
  async create(
    client: PoolClient,
    data: { id: string; path: string; contentType: string; createdBy: number | null },
  ): Promise<void> {
    await client.query(
      `
        INSERT INTO pending_uploads (id, path, content_type, created_by)
        VALUES ($1, $2, $3, $4)
      `,
      [data.id, data.path, data.contentType, data.createdBy],
    );
  }

  async claim(client: PoolClient, ids: string[]): Promise<PendingUpload[]> {
    if (ids.length === 0) {
      return [];
    }

    const result = await client.query<PendingUpload>(
      `
        DELETE FROM pending_uploads
        WHERE id = ANY ($1::uuid[])
        RETURNING ${COLUMNS}
      `,
      [ids],
    );

    const byId = new Map(result.rows.map((row) => [row.id, mapRow(row)]));

    return ids.flatMap((id) => byId.get(id) ?? []);
  }

  async deleteExpired(client: PoolClient, olderThan: Date): Promise<PendingUpload[]> {
    const result = await client.query<PendingUpload>(
      `
        DELETE FROM pending_uploads
        WHERE created_at < $1
        RETURNING ${COLUMNS}
      `,
      [olderThan],
    );

    return result.rows.map(mapRow);
  }
}
