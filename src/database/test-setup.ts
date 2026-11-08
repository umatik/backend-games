import {afterAll, afterEach, beforeAll} from "@jest/globals";
import dotenv from "dotenv";
import https from "node:https";
import type { AddressInfo } from "node:net";
import supertest from "supertest";
import {resetTestDatabase, seedTestDatabase} from "@/database/test-database.js";

process.env.NODE_ENV = "test";

// Supertest uruchamia serwer przez `listen(0)` (losowy port na `::`, IPv6 + IPv4), ale zawsze łączy się
// z 127.0.0.1. Jeśli inny program na komputerze słucha na 127.0.0.1 pod tym samym numerem portu (macOS na to
// pozwala), przejmuje połączenie: losowe „socket hang up”, puste 404/503 i 401 w testach. Gdy serwer słucha na
// IPv6, łączymy się więc z [::1], gdzie ten port na pewno należy do naszego serwera.
type ServerLike = {
  address(): AddressInfo | string | null;
  listen(port: number): unknown;
};

const SupertestTest = (supertest as unknown as { Test: { prototype: Record<string, unknown> } })
  .Test;

SupertestTest.prototype.serverAddress = function (
  this: { _server?: unknown },
  app: ServerLike,
  path: string,
) {
  if (!app.address()) {
    this._server = app.listen(0);
  }

  const address = app.address() as AddressInfo;
  const host = address.family === "IPv6" ? "[::1]" : "127.0.0.1";
  const protocol = app instanceof https.Server ? "https" : "http";

  return `${protocol}://${host}:${address.port}${path}`;
};

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