import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrationsPath = path.join(__dirname, "migrations");

const runMigrations = async () => {
  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const files = await fs.readdir(migrationsPath);

    const migrations = files.filter((file) => file.endsWith(".sql")).sort();

    for (const migration of migrations) {
      const result = await client.query(
        "SELECT version FROM schema_migrations WHERE version = $1",
        [migration],
      );

      if (result.rows.length > 0) {
        continue;
      }

      const sql = await fs.readFile(
        path.join(migrationsPath, migration),
        "utf-8",
      );

      await client.query("BEGIN");

      try {
        await client.query(sql);

        await client.query(
          "INSERT INTO schema_migrations (version) VALUES ($1)",
          [migration],
        );

        await client.query("COMMIT");

        console.log(`Applied migration: ${migration}`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
};

runMigrations().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
