import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { pool } from "../database/db.js";

const migrationsPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../database/migrations",
);

export async function resetTestDatabase(): Promise<void> {
  await pool.query(`
    TRUNCATE TABLE
      order_items,
      orders,
      login_logs,
      user_roles,
      role_permissions,
      product_variants,
      products,
      user_contact_details,
      users,
      roles,
      permissions
    RESTART IDENTITY CASCADE;
  `);
}

export async function seedTestDatabase(): Promise<void> {
  const seedPath = path.join(migrationsPath, "010_seed_data.sql");

  const seedSql = await readFile(seedPath, "utf-8");

  await pool.query(seedSql);
}
