import {afterAll, afterEach, beforeAll} from "@jest/globals";
import dotenv from "dotenv";
import {resetTestDatabase, seedTestDatabase} from "./test-database.js";

process.env.NODE_ENV = "test";

dotenv.config({
  path: ".env.test",
  override: true,
});

const {pool} = await import("./db.js");

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