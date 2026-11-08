import path from "node:path";
import { afterAll, describe, expect, it } from "@jest/globals";
import request from "supertest";
import app from "@/app.js";
import { redisClient } from "@/dependency-injection.js";
import { pool } from "@/database/db.js";
import { loginAsAdmin, loginAsUser } from "@/__test-helpers__/auth.js";

/** Rzeczy, których potrzebuje panel admina: kim jestem, zdjęcia, CORS i specyfikacja OpenAPI. */

afterAll(async () => {
  await redisClient.close();
});

const photo = path.resolve("src/__tests__/unit/services/fixtures/uploads/test-photo.jpg");

describe("GET /users/me", () => {
  it("should require a token", async () => {
    expect((await request(app).get("/users/me")).status).toBe(401);
  });

  it("should return the admin with permissions for the panel", async () => {
    const response = await request(app)
      .get("/users/me")
      .set("Authorization", `Bearer ${await loginAsAdmin()}`);

    expect(response.status).toBe(200);
    expect(response.body.user).toEqual(expect.objectContaining({ email: "bob@example.com" }));
    expect(response.body.user).not.toHaveProperty("passwordHash");
    expect(response.body.permissions).toEqual(
      expect.arrayContaining(["products:create", "products:publish", "settings:manage"]),
    );
  });

  it("should return a regular user without panel permissions", async () => {
    const response = await request(app)
      .get("/users/me")
      .set("Authorization", `Bearer ${await loginAsUser()}`);

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe("alice@example.com");
    expect(response.body.permissions).toEqual(["orders:create", "orders:delete", "users:update"]);
  });

  it("should reject a valid token of a deleted account", async () => {
    const token = await loginAsUser();
    await pool.query("DELETE FROM users WHERE email = 'alice@example.com'");

    const response = await request(app).get("/users/me").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(401);
  });
});

describe("GET /uploads", () => {
  it("should serve an uploaded photo to another origin", async () => {
    const uploaded = await request(app)
      .post("/products/variants/1/media")
      .set("Authorization", `Bearer ${await loginAsAdmin()}`)
      .attach("file", photo)
      .field("sortOrder", "0")
      .field("isPrimary", "false");
    expect(uploaded.status).toBe(201);

    const file = await request(app).get(`/uploads/${uploaded.body.url}`);

    expect(file.status).toBe(200);
    expect(file.headers["content-type"]).toBe("image/jpeg");
    expect(file.headers["cross-origin-resource-policy"]).toBe("cross-origin");
    expect(file.headers["cache-control"]).toContain("immutable");
  });

  it("should answer 404 for a missing file", async () => {
    const response = await request(app).get("/uploads/products/photo/missing.jpg");

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Route not found");
  });

  it("should not serve files outside the uploads folder", async () => {
    for (const url of ["/uploads/../.env.test", "/uploads/%2e%2e/.env.test", "/uploads/..%2f.env.test"]) {
      const response = await request(app).get(url);

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
      expect(response.text).not.toContain("JWT_SECRET");
    }
  });
});

describe("CORS", () => {
  it("should allow the configured origin and nothing else", async () => {
    const allowed = await request(app).get("/products").set("Origin", "http://localhost:3000");
    const other = await request(app).get("/products").set("Origin", "https://evil.example.com");

    expect(allowed.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
    expect(other.headers["access-control-allow-origin"]).toBeUndefined();
  });
});

describe("GET /api-docs.json", () => {
  it("should return the OpenAPI specification", async () => {
    const response = await request(app).get("/api-docs.json");

    expect(response.status).toBe(200);
    expect(response.body.openapi).toBe("3.0.0");
    expect(Object.keys(response.body.paths)).toEqual(
      expect.arrayContaining(["/users/me", "/products/manage", "/products/lookup/photo", "/settings"]),
    );
  });
});

describe("client errors", () => {
  it("should answer 400 for malformed JSON instead of 500", async () => {
    const response = await request(app)
      .post("/login")
      .set("Content-Type", "application/json")
      .send('{"email": ');

    expect(response.status).toBe(400);
    expect(response.body.message).toEqual(expect.any(String));
  });
});
