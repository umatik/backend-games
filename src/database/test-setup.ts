import {afterAll, afterEach, beforeAll} from "@jest/globals";
import {pool} from "./db.js";
import {resetTestDatabase, seedTestDatabase} from "./test-database.js";

beforeAll(async () => {
  await resetTestDatabase();
  await seedTestDatabase();
});

afterEach(async () => {
  await resetTestDatabase();
  await seedTestDatabase();
});

afterAll(async () => {
  await pool.end();
});