import { afterAll, beforeAll } from "@jest/globals";
import { pool } from "../database/db.js";
import { resetTestDatabase, seedTestDatabase } from "./test-database.js";

beforeAll(async () => {
  await resetTestDatabase();
  await seedTestDatabase();
});

afterAll(async () => {
  await resetTestDatabase();
  await pool.end();
});
