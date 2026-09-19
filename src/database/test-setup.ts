import {afterAll, beforeAll} from "@jest/globals";

import {
  resetTestDatabase,
  seedTestDatabase,
} from "./test-database.js";

import {pool} from "./db.js";

beforeAll(async () => {
  await resetTestDatabase();
  await seedTestDatabase();
});

afterAll(async () => {
  await resetTestDatabase();
  await pool.end();
});