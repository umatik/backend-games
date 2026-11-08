import {afterAll, afterEach, beforeAll} from "@jest/globals";
import http from "node:http";
import dotenv from "dotenv";
import {resetTestDatabase, seedTestDatabase} from "@/database/test-database.js";

process.env.NODE_ENV = "test";

// Supertest uruchamia serwer przez `listen(0)`, czyli na losowym porcie na wszystkich adresach (`::`), ale łączy się
// z 127.0.0.1. Jeśli inny program na komputerze słucha akurat na 127.0.0.1 pod tym samym numerem portu,
// przejmuje połączenie: losowe „socket hang up”, puste 404/503 i 401 w testach. Wiążemy więc serwery testowe
// bez podanego hosta z 127.0.0.1, gdzie system wybiera port naprawdę wolny.
const originalListen = http.Server.prototype.listen;

http.Server.prototype.listen = function (this: http.Server, ...args: unknown[]) {
  if (typeof args[0] === "number" && typeof args[1] !== "string") {
    args.splice(1, 0, "127.0.0.1");
  }

  return (originalListen as (...listenArgs: unknown[]) => http.Server).apply(this, args);
} as typeof http.Server.prototype.listen;

dotenv.config({
  path: ".env.test",
  override: true,
});

const {pool} = await import("@/database/db.js");

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