import { afterAll, describe, expect, it } from "@jest/globals";
import request from "supertest";
import app from "@/app.js";
import { redisClient } from "@/dependency-injection.js";
import { loginAsAdmin, loginAsUser } from "@/__test-helpers__/auth.js";
import { pool } from "@/database/db.js";

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
    // Zdjęcie jest zapisane mimo błędu, żeby kreator mógł przejść do formularza ręcznego z tym zdjęciem.
    expect(response.body.photoUploadIds).toHaveLength(1);

    const pending = await pool.query("SELECT path FROM pending_uploads WHERE id = $1", [
      response.body.photoUploadIds[0],
    ]);

    expect(pending.rows[0].path).toMatch(/^products\/photo\/label-.+\.jpg$/);
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

  it("should attach a kept label photo as the primary photo of a new variant", async () => {
    const token = await loginAsAdmin();
    const uploadId = "6f1c2c1e-6d2b-4d61-9a0e-3f4c5b6a7d8e";

    // Rozpoznawanie wymaga Claude, więc zdjęcie dodajemy tak, jak zapisuje je rozpoznawanie.
    await pool.query(
      `INSERT INTO pending_uploads (id, path, content_type, created_by)
       VALUES ($1, 'products/photo/label-test.jpg', 'image/jpeg', 2)`,
      [uploadId],
    );

    const created = await request(app)
      .post("/products/1/variants")
      .set("Authorization", `Bearer ${token}`)
      .send({
        priceEur: 1500,
        attributes: { format: '7"', mediaCondition: "NM", sleeveCondition: "generic" },
        photoUploadIds: [uploadId],
      });

    expect(created.status).toBe(201);
    expect(created.body.variant.media).toEqual([
      expect.objectContaining({
        type: "photo",
        url: "products/photo/label-test.jpg",
        isPrimary: true,
        sortOrder: 0,
      }),
    ]);

    const reused = await request(app)
      .post("/products/1/variants")
      .set("Authorization", `Bearer ${token}`)
      .send({
        priceEur: 1500,
        attributes: { format: '7"', mediaCondition: "NM", sleeveCondition: "generic" },
        photoUploadIds: [uploadId],
      });

    expect(reused.status).toBe(400);
    expect(reused.body.errors).toEqual([
      expect.objectContaining({ path: "photoUploadIds" }),
    ]);
  });

  describe("existing products (duplicates)", () => {
    const findExisting = async (query: string) =>
      request(app)
        .get(`/products/lookup/existing?${query}`)
        .set("Authorization", `Bearer ${await loginAsAdmin()}`);

    it("should find the product with the same Discogs release", async () => {
      const response = await findExisting("discogsReleaseId=34434571");

      expect(response.status).toBe(200);
      expect(response.body.existingProducts).toEqual([
        {
          productId: 1,
          type: "vinyl",
          title: "Jah Prophecy",
          artists: ["Bunnington Judah", "Zulu Vibes"],
          isPublished: true,
          matchedBy: ["discogs_release"],
          matchingVariantIds: [1],
        },
      ]);
    });

    it("should match the catalog number regardless of case, spaces and dashes", async () => {
      const response = await findExisting("catalogNumber=zv%207%20006&label=zulu%20vibes");

      expect(response.body.existingProducts).toEqual([
        expect.objectContaining({
          productId: 1,
          matchedBy: ["catalog_number"],
          matchingVariantIds: [1, 2],
        }),
      ]);
    });

    it("should not match the catalog number of another label", async () => {
      const response = await findExisting("catalogNumber=ZV-7-006&label=Greensleeves");

      expect(response.body.existingProducts).toEqual([]);
    });

    it("should find the same album in another pressing by title and artist", async () => {
      const response = await findExisting(
        "title=dub%20from%20zion&artist=Roots%20Foundation&catalogNumber=VP-999",
      );

      expect(response.body.existingProducts).toEqual([
        expect.objectContaining({
          productId: 2,
          matchedBy: ["title_artist"],
          matchingVariantIds: [],
        }),
      ]);
    });

    it("should list the strongest match first and combine reasons", async () => {
      const response = await findExisting(
        "discogsReleaseId=34434571&catalogNumber=ZV-7-006&title=Jah%20Prophecy&artist=Zulu%20Vibes",
      );

      expect(response.body.existingProducts[0]).toEqual(
        expect.objectContaining({
          productId: 1,
          matchedBy: ["discogs_release", "catalog_number", "title_artist"],
        }),
      );
    });

    it("should require a release id, catalog number or title", async () => {
      const response = await findExisting("label=Zulu%20Vibes");

      expect(response.status).toBe(400);
    });
  });
});
