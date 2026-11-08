import { inspect } from "node:util";
import { afterAll, afterEach, describe, expect, it, jest } from "@jest/globals";
import request from "supertest";
import app from "@/app.js";
import { redisClient } from "@/dependency-injection.js";
import { loginAsAdmin } from "@/__test-helpers__/auth.js";

/** Sekrety z niepoprawnego body nie mogą trafić do logów ani do odpowiedzi (audyt 2026-11-08, P1). */

afterAll(async () => {
  await redisClient.close();
});

afterEach(() => {
  jest.restoreAllMocks();
});

const FAKE_SECRET = "AUDIT_FAKE_SECRET_1234567890";
const FAKE_PASSWORD = "AUDIT_FAKE_PASSWORD_0987654321";

const captureLogs = () => {
  const calls: unknown[][] = [];

  for (const method of ["error", "warn", "log", "info"] as const) {
    jest.spyOn(console, method).mockImplementation((...args: unknown[]) => {
      calls.push(args);
    });
  }

  return () => calls.map((args) => args.map((arg) => inspect(arg, { depth: 10 })).join(" ")).join("\n");
};

describe("Error logging", () => {
  it.each([
    ["the settings endpoint", "/settings", `{"values":{"anthropic.apiKey":"${FAKE_SECRET}",}}`, FAKE_SECRET],
    ["the login endpoint", "/login", `{"email":"bob@example.com","password":"${FAKE_PASSWORD}"`, FAKE_PASSWORD],
  ])("should not log or return a secret from malformed JSON sent to %s", async (_name, url, body, secret) => {
    const token = await loginAsAdmin();
    const logs = captureLogs();

    const agent = request(app);
    const response = await (url === "/settings" ? agent.patch(url) : agent.post(url))
      .set("Authorization", `Bearer ${token}`)
      .set("Content-Type", "application/json")
      .send(body);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: "Malformed JSON" });
    expect(response.text).not.toContain(secret);
    expect(logs()).toContain("entity.parse.failed");
    expect(logs()).not.toContain(secret);
  });
});
