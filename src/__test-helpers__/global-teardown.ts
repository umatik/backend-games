import { pool } from "../database/db.js";

export default async function globalTeardown() {
  await pool.end();
}
