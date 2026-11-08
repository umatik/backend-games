import { afterAll, describe, expect, it } from "@jest/globals";
import request from "supertest";
import app from "@/app.js";
import { redisClient } from "@/dependency-injection.js";
import { loginAsAdmin, loginAsUser } from "@/__test-helpers__/auth.js";

afterAll(async () => {
  await redisClient.close();
});

// W testach Claude i Discogs są wyłączone (bez sieci), więc poprawne zapytania kończą się 503.
// Logikę rozpoznawania sprawdzają testy jednostkowe z atrapami.
describe("Record lookup API", () => {
  it("should require authentication", async () => {
    const response = await request(app).get("/products/lookup?catalogNumber=ZV-7-006");

    expect(response.status).toBe(401);
  });

  it("should not let a regular user use the wizard helpers", async () => {
    const token = await loginAsUser();

    const response = await request(app)
      .get("/products/lookup?catalogNumber=ZV-7-006")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(403);
  });

  it("should validate the catalog number before calling Discogs", async () => {
    const token = await loginAsAdmin();

    const response = await request(app)
      .get("/products/lookup")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(response.body.errors).toEqual([
      expect.objectContaining({ path: "catalogNumber" }),
    ]);
  });

  it("should answer 503 when Discogs is not configured", async () => {
    const token = await loginAsAdmin();

    const search = await request(app)
      .get("/products/lookup?catalogNumber=ZV-7-006")
      .set("Authorization", `Bearer ${token}`);
    const release = await request(app)
      .get("/products/lookup/releases/123")
      .set("Authorization", `Bearer ${token}`);

    expect(search.status).toBe(503);
    expect(search.body.message).toBe("Discogs integration is not configured");
    expect(release.status).toBe(503);
  });

  it("should require 1–2 label photos", async () => {
    const token = await loginAsAdmin();

    const none = await request(app)
      .post("/products/lookup/photo")
      .set("Authorization", `Bearer ${token}`);

    const tooMany = await request(app)
      .post("/products/lookup/photo")
      .set("Authorization", `Bearer ${token}`)
      .attach("images", Buffer.from("a"), { filename: "a.jpg", contentType: "image/jpeg" })
      .attach("images", Buffer.from("b"), { filename: "b.jpg", contentType: "image/jpeg" })
      .attach("images", Buffer.from("c"), { filename: "c.jpg", contentType: "image/jpeg" });

    expect(none.status).toBe(400);
    expect(tooMany.status).toBe(400);
  });

  it("should reject photos that are not JPEG, PNG or WebP", async () => {
    const token = await loginAsAdmin();

    const response = await request(app)
      .post("/products/lookup/photo")
      .set("Authorization", `Bearer ${token}`)
      .attach("images", Buffer.from("gif"), { filename: "a.gif", contentType: "image/gif" });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Label photos must be JPEG, PNG or WebP");
  });

  it("should answer 503 for a valid photo when Claude is not configured", async () => {
    const token = await loginAsAdmin();

    const response = await request(app)
      .post("/products/lookup/photo")
      .set("Authorization", `Bearer ${token}`)
      .attach("images", Buffer.from("jpg"), { filename: "a.jpg", contentType: "image/jpeg" });

    expect(response.status).toBe(503);
    expect(response.body.message).toBe("Claude integration is not configured");
  });

  it("should validate the condition note before calling Claude", async () => {
    const token = await loginAsAdmin();

    const empty = await request(app)
      .post("/products/lookup/condition-note")
      .set("Authorization", `Bearer ${token}`)
      .send({ text: " " });

    const valid = await request(app)
      .post("/products/lookup/condition-note")
      .set("Authorization", `Bearer ${token}`)
      .send({ text: "Lekki trzask na stronie B" });

    expect(empty.status).toBe(400);
    expect(valid.status).toBe(503);
  });

  it("should not break the product routes", async () => {
    const response = await request(app).get("/products/1");

    expect(response.status).toBe(200);
  });
});
