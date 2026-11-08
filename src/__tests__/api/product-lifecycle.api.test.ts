import { access } from "node:fs/promises";
import path from "node:path";
import { afterAll, beforeEach, describe, expect, it } from "@jest/globals";
import request from "supertest";
import app from "@/app.js";
import { redisClient } from "@/dependency-injection.js";
import { pool } from "@/database/db.js";
import { loginAsAdmin, loginAsUser } from "@/__test-helpers__/auth.js";

/** Publikacja, usuwanie (twarde i miękkie) oraz zapis produktu z kreatora razem ze zdjęciem labelu. */

afterAll(async () => {
  await redisClient.close();
});

const photo = path.resolve("src/__tests__/unit/services/fixtures/uploads/test-photo.jpg");

const vinylVariant = { format: "LP", mediaCondition: "NM", sleeveCondition: "VG+" };

let admin: string;

beforeEach(async () => {
  admin = await loginAsAdmin();
});

const asAdmin = (req: request.Test) => req.set("Authorization", `Bearer ${admin}`);

const fileExists = async (url: string) => {
  try {
    await access(path.join(process.env.STORAGE_PATH ?? "./uploads", url));
    return true;
  } catch {
    return false;
  }
};

const createDraft = async (title = "Lifecycle Dub") => {
  const response = await asAdmin(request(app).post("/products")).send({
    type: "vinyl",
    title,
    attributes: { artists: ["Lifecycle Sound"] },
    variants: [{ priceEur: 2000, attributes: vinylVariant }],
  });

  expect(response.status).toBe(201);

  return {
    productId: response.body.product.id as number,
    variantId: response.body.product.variants[0].id as number,
  };
};

const uploadPhoto = async (variantId: number): Promise<string> => {
  const response = await asAdmin(request(app).post(`/products/variants/${variantId}/media`))
    .attach("file", photo)
    .field("sortOrder", "0")
    .field("isPrimary", "true");

  expect(response.status).toBe(201);
  expect(await fileExists(response.body.url)).toBe(true);

  return response.body.url;
};

const order = async (variantId: number) => {
  const response = await request(app)
    .post("/orders")
    .set("Authorization", `Bearer ${await loginAsUser()}`)
    .send({ items: [{ productVariantId: variantId, quantity: 1 }] });

  expect(response.status).toBe(201);
};

const isDeletedInDatabase = async (productId: number) => {
  const result = await pool.query("SELECT is_deleted FROM products WHERE id = $1", [productId]);
  return result.rows[0]?.is_deleted as boolean | undefined;
};

const shopIds = async (query: Record<string, string>) => {
  const response = await request(app).get("/products").query(query);
  expect(response.status).toBe(200);
  return response.body.products.map((product: { id: number }) => product.id);
};

describe("Product lifecycle API – deleting", () => {
  it("should permanently delete a draft together with its files", async () => {
    const { productId, variantId } = await createDraft();
    const url = await uploadPhoto(variantId);

    const deleted = await asAdmin(request(app).delete(`/products/${productId}`));

    expect(deleted.status).toBe(204);
    expect(await isDeletedInDatabase(productId)).toBeUndefined();
    expect(await fileExists(url)).toBe(false);
    expect((await asAdmin(request(app).get(`/products/manage/${productId}`))).status).toBe(404);
  });

  it("should permanently delete a draft variant together with its files", async () => {
    const { productId, variantId } = await createDraft();
    const url = await uploadPhoto(variantId);

    const deleted = await asAdmin(
      request(app).delete(`/products/${productId}/variants/${variantId}`),
    );

    expect(deleted.status).toBe(200);
    expect(await fileExists(url)).toBe(false);

    const product = await asAdmin(request(app).get(`/products/manage/${productId}`));
    expect(product.body.product.variants).toEqual([]);
  });

  it("should only hide an ordered draft and keep it in the order history", async () => {
    const { productId, variantId } = await createDraft();
    const url = await uploadPhoto(variantId);
    await asAdmin(request(app).post(`/products/${productId}/publish`));
    await order(variantId);
    await asAdmin(request(app).post(`/products/${productId}/unpublish`));

    const deleted = await asAdmin(request(app).delete(`/products/${productId}`));

    expect(deleted.status).toBe(204);
    expect(await isDeletedInDatabase(productId)).toBe(true);
    expect(await fileExists(url)).toBe(true);
    expect((await asAdmin(request(app).get(`/products/manage/${productId}`))).status).toBe(404);

    const history = await request(app)
      .get("/orders/my")
      .set("Authorization", `Bearer ${await loginAsUser()}`);
    expect(history.body).toEqual([
      expect.objectContaining({
        items: [expect.objectContaining({ productVariantId: variantId, priceEur: 2000 })],
      }),
    ]);
  });

  it("should remove a deleted product from a cached shop listing", async () => {
    const { productId } = await createDraft();
    await asAdmin(request(app).post(`/products/${productId}/publish`));

    expect(await shopIds({ artist: "Lifecycle Sound" })).toEqual([productId]);

    await asAdmin(request(app).delete(`/products/${productId}`));

    expect(await shopIds({ artist: "Lifecycle Sound" })).toEqual([]);
    expect(await isDeletedInDatabase(productId)).toBe(true);
  });

  it("should not publish a deleted product", async () => {
    const { productId } = await createDraft();
    await asAdmin(request(app).post(`/products/${productId}/publish`));
    await asAdmin(request(app).delete(`/products/${productId}`));

    expect((await asAdmin(request(app).post(`/products/${productId}/publish`))).status).toBe(404);
  });
});

describe("Product lifecycle API – published product keeps a variant", () => {
  it("should refuse to delete the last variant of a published product", async () => {
    const { productId, variantId } = await createDraft();
    await asAdmin(request(app).post(`/products/${productId}/publish`));
    expect(await shopIds({ artist: "Lifecycle Sound" })).toEqual([productId]);

    const deleted = await asAdmin(
      request(app).delete(`/products/${productId}/variants/${variantId}`),
    );

    expect(deleted.status).toBe(409);
    expect(deleted.body.message).toContain("Unpublish or delete the product");

    const page = await request(app).get(`/products/${productId}`);
    expect(page.body.product.variants.map((variant: { id: number }) => variant.id)).toEqual([
      variantId,
    ]);
  });

  it("should allow it after unpublishing, and the whole product can still be deleted", async () => {
    const { productId, variantId } = await createDraft();
    await asAdmin(request(app).post(`/products/${productId}/publish`));
    await asAdmin(request(app).post(`/products/${productId}/unpublish`));

    const deleted = await asAdmin(
      request(app).delete(`/products/${productId}/variants/${variantId}`),
    );
    expect(deleted.status).toBe(200);

    const second = await createDraft("Second Lifecycle Dub");
    await asAdmin(request(app).post(`/products/${second.productId}/publish`));
    expect((await asAdmin(request(app).delete(`/products/${second.productId}`))).status).toBe(204);
    expect(await shopIds({ artist: "Lifecycle Sound" })).toEqual([]);
  });
});

describe("Product lifecycle API – publishing", () => {
  it("should allow publishing twice", async () => {
    const { productId } = await createDraft();

    expect((await asAdmin(request(app).post(`/products/${productId}/publish`))).status).toBe(200);
    const again = await asAdmin(request(app).post(`/products/${productId}/publish`));

    expect(again.status).toBe(200);
    expect(again.body.product.isPublished).toBe(true);
  });

  it("should show an edited title in a cached shop listing", async () => {
    const { productId } = await createDraft();
    await asAdmin(request(app).post(`/products/${productId}/publish`));
    await shopIds({ artist: "Lifecycle Sound" });

    const updated = await asAdmin(request(app).patch(`/products/${productId}`)).send({
      title: "Lifecycle Dub (Remastered)",
    });
    expect(updated.status).toBe(200);
    expect(updated.body.product.isPublished).toBe(true);

    const listing = await request(app).get("/products").query({ artist: "Lifecycle Sound" });
    expect(listing.body.products[0].title).toBe("Lifecycle Dub (Remastered)");
  });

  it("should guard unpublishing", async () => {
    const { productId } = await createDraft();
    const user = await loginAsUser();

    const anonymous = await request(app).post(`/products/${productId}/unpublish`);
    const regularUser = await request(app)
      .post(`/products/${productId}/unpublish`)
      .set("Authorization", `Bearer ${user}`);
    const missing = await asAdmin(request(app).post("/products/999999/unpublish"));

    expect(anonymous.status).toBe(401);
    expect(regularUser.status).toBe(403);
    expect(missing.status).toBe(404);
  });
});

describe("Product lifecycle API – wizard", () => {
  const UPLOAD_ID = "0b6f7c55-2f0c-4b1e-8f2a-5c3d9e1a7b42";

  const keepLabelPhoto = async () => {
    // Tak zapisuje zdjęcie rozpoznawanie płyty (POST /products/lookup/photo), które wymaga Claude.
    await pool.query(
      `INSERT INTO pending_uploads (id, path, content_type, created_by)
       VALUES ($1, 'products/photo/wizard-label.jpg', 'image/jpeg', 2)`,
      [UPLOAD_ID],
    );
  };

  const countProducts = async () =>
    Number((await pool.query("SELECT COUNT(*) FROM products")).rows[0].count);

  it("should save a new record with the label photo in one request", async () => {
    await keepLabelPhoto();

    const created = await asAdmin(request(app).post("/products")).send({
      type: "vinyl",
      title: "Wizard Dub",
      attributes: { artists: ["Wizard Sound"] },
      variants: [{ priceEur: 1500, attributes: vinylVariant, photoUploadIds: [UPLOAD_ID] }],
    });

    expect(created.status).toBe(201);
    expect(created.body.product.isPublished).toBe(false);
    expect(created.body.product.variants[0].media).toEqual([
      expect.objectContaining({ url: "products/photo/wizard-label.jpg", isPrimary: true }),
    ]);

    const pending = await pool.query("SELECT 1 FROM pending_uploads WHERE id = $1", [UPLOAD_ID]);
    expect(pending.rowCount).toBe(0);
  });

  it("should not accept a label photo older than 24 hours", async () => {
    await keepLabelPhoto();
    await pool.query(
      "UPDATE pending_uploads SET created_at = NOW() - INTERVAL '48 hours' WHERE id = $1",
      [UPLOAD_ID],
    );
    const before = await countProducts();

    const created = await asAdmin(request(app).post("/products")).send({
      type: "vinyl",
      title: "Wizard Dub",
      attributes: { artists: ["Wizard Sound"] },
      variants: [{ priceEur: 1500, attributes: vinylVariant, photoUploadIds: [UPLOAD_ID] }],
    });

    expect(created.status).toBe(400);
    expect(created.body.errors).toEqual([
      expect.objectContaining({ path: "variants.0.photoUploadIds" }),
    ]);
    expect(await countProducts()).toBe(before);

    // Przeterminowane zdjęcie zostaje dla sprzątania, które usunie je razem z plikiem.
    const pending = await pool.query("SELECT 1 FROM pending_uploads WHERE id = $1", [UPLOAD_ID]);
    expect(pending.rowCount).toBe(1);
  });

  it("should save nothing when a photo is unknown", async () => {
    await keepLabelPhoto();
    const before = await countProducts();

    const created = await asAdmin(request(app).post("/products")).send({
      type: "vinyl",
      title: "Wizard Dub",
      attributes: { artists: ["Wizard Sound"] },
      variants: [
        { priceEur: 1500, attributes: vinylVariant, photoUploadIds: [UPLOAD_ID] },
        {
          priceEur: 1200,
          attributes: vinylVariant,
          photoUploadIds: ["11111111-1111-4111-8111-111111111111"],
        },
      ],
    });

    expect(created.status).toBe(400);
    expect(created.body.errors).toEqual([
      expect.objectContaining({ path: "variants.1.photoUploadIds" }),
    ]);
    expect(await countProducts()).toBe(before);

    // Zdjęcie pierwszego wariantu wraca do puli, bo transakcja została wycofana.
    const pending = await pool.query("SELECT 1 FROM pending_uploads WHERE id = $1", [UPLOAD_ID]);
    expect(pending.rowCount).toBe(1);
  });
});
