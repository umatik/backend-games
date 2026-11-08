import { afterAll, describe, expect, it } from "@jest/globals";
import request from "supertest";
import app from "@/app.js";
import { redisClient } from "@/dependency-injection.js";
import { loginAsAdmin, loginAsUser } from "@/__test-helpers__/auth.js";
import { pool } from "@/database/db.js";

afterAll(async () => {
  await redisClient.close();
});

const API_KEY = "sk-ant-api03-test-key-that-is-long-enough-9876";

type Setting = {
  key: string;
  isSet: boolean;
  source: string | null;
  value?: unknown;
  maskedValue?: string;
  updatedBy: string | null;
};

const byKey = (settings: Setting[], key: string) =>
  settings.find((setting) => setting.key === key)!;

describe("Settings API", () => {
  it("should be available only to admins", async () => {
    const anonymous = await request(app).get("/settings");
    const user = await request(app)
      .get("/settings")
      .set("Authorization", `Bearer ${await loginAsUser()}`);

    expect(anonymous.status).toBe(401);
    expect(user.status).toBe(403);
  });

  it("should list settings with defaults", async () => {
    const response = await request(app)
      .get("/settings")
      .set("Authorization", `Bearer ${await loginAsAdmin()}`);

    expect(response.status).toBe(200);
    expect(byKey(response.body.settings, "anthropic.model")).toEqual(
      expect.objectContaining({
        kind: "select",
        options: ["claude-haiku-5-5", "claude-opus-5-5"],
        value: "claude-haiku-5-5",
        source: "default",
      }),
    );
    expect(byKey(response.body.settings, "anthropic.apiKey").isSet).toBe(false);
  });

  it("should save a secret encrypted and only ever return it masked", async () => {
    const token = await loginAsAdmin();

    const updated = await request(app)
      .patch("/settings")
      .set("Authorization", `Bearer ${token}`)
      .send({ values: { "anthropic.apiKey": API_KEY, "anthropic.model": "claude-opus-5-5" } });

    expect(updated.status).toBe(200);
    expect(JSON.stringify(updated.body)).not.toContain(API_KEY);
    expect(byKey(updated.body.settings, "anthropic.apiKey")).toEqual(
      expect.objectContaining({
        isSet: true,
        source: "database",
        maskedValue: "sk-ant…9876",
        updatedBy: "bob@example.com",
      }),
    );
    expect(byKey(updated.body.settings, "anthropic.model").value).toBe("claude-opus-5-5");

    const listed = await request(app).get("/settings").set("Authorization", `Bearer ${token}`);
    expect(JSON.stringify(listed.body)).not.toContain(API_KEY);

    const row = await pool.query(
      "SELECT value, encrypted_value FROM settings WHERE key = 'anthropic.apiKey'",
    );
    expect(row.rows[0].value).toBeNull();
    expect(row.rows[0].encrypted_value).not.toContain(API_KEY);
  });

  it("should clear a value with null", async () => {
    const token = await loginAsAdmin();

    await request(app)
      .patch("/settings")
      .set("Authorization", `Bearer ${token}`)
      .send({ values: { "shop.name": "Ras Bass Records" } });

    const cleared = await request(app)
      .patch("/settings")
      .set("Authorization", `Bearer ${token}`)
      .send({ values: { "shop.name": null } });

    expect(byKey(cleared.body.settings, "shop.name")).toEqual(
      expect.objectContaining({ value: "Ras Bass", source: "default" }),
    );
  });

  it("should reject unknown settings and invalid values", async () => {
    const response = await request(app)
      .patch("/settings")
      .set("Authorization", `Bearer ${await loginAsAdmin()}`)
      .send({ values: { "shop.contactEmail": "not-an-email", "shop.color": "red" } });

    expect(response.status).toBe(400);
    expect(response.body.errors.map((error: { path: string }) => error.path)).toEqual([
      "shop.contactEmail",
      "shop.color",
    ]);
  });

  it("should reject an empty update", async () => {
    const response = await request(app)
      .patch("/settings")
      .set("Authorization", `Bearer ${await loginAsAdmin()}`)
      .send({ values: {} });

    expect(response.status).toBe(400);
  });

  it("should report integrations as not configured in the test environment", async () => {
    const token = await loginAsAdmin();

    const discogs = await request(app)
      .post("/settings/test/discogs")
      .set("Authorization", `Bearer ${token}`);
    const unknown = await request(app)
      .post("/settings/test/spotify")
      .set("Authorization", `Bearer ${token}`);

    expect(discogs.status).toBe(200);
    expect(discogs.body.ok).toBe(false);
    expect(unknown.status).toBe(404);
  });
});
