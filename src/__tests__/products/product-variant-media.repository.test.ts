import { beforeEach, afterEach, describe, it, expect } from "@jest/globals";
import type { PoolClient } from "pg";
import { pool } from "@/database/db.js";
import { ProductVariantMediaPostgresRepository } from "@/repositories/products/product-media/product-variant-media-postgres.repository.js";

describe("ProductVariantMediaPostgresRepository", () => {
  const repository = new ProductVariantMediaPostgresRepository();

  let client: PoolClient;
  let productId: number;
  let productVariantId: number;

  beforeEach(async () => {
    client = await pool.connect();

    const productResult = await client.query<{ id: number }>(
      `
        INSERT INTO products (
          name
        )
        VALUES ($1)
        RETURNING id
      `,
      ["Test product"],
    );

    productId = productResult.rows[0]!.id;

    const variantResult = await client.query<{ id: number }>(
      `
        INSERT INTO product_variants (
          product_id,
          color,
          size,
          price,
          quantity
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `,
      [productId, "Black", "M", 99.99, 10],
    );

    productVariantId = variantResult.rows[0]!.id;
  });

  afterEach(async () => {
    client.release();
  });

  it("should create product variant media", async () => {
    const media = await repository.create(
      client,
      productVariantId,
      "photo",
      "products/test/photo.webp",
      "Test photo",
      0,
      true,
    );

    expect(media.id).toBeDefined();
    expect(media.productVariantId).toBe(productVariantId);
    expect(media.type).toBe("photo");
    expect(media.url).toBe("products/test/photo.webp");
    expect(media.alt).toBe("Test photo");
    expect(media.sortOrder).toBe(0);
    expect(media.isPrimary).toBe(true);
    expect(media.createdAt).toEqual(expect.any(Date));
    expect(media.updatedAt).toEqual(expect.any(Date));
  });

  it("should find media by id", async () => {
    const created = await repository.create(
      client,
      productVariantId,
      "photo",
      "products/test/photo.webp",
      "Test photo",
      0,
      true,
    );

    const media = await repository.findById(client, created.id);

    expect(media).not.toBeNull();
    expect(media?.id).toBe(created.id);
    expect(media?.productVariantId).toBe(productVariantId);
    expect(media?.type).toBe("photo");
    expect(media?.url).toBe("products/test/photo.webp");
  });

  it("should return null when media does not exist", async () => {
    const media = await repository.findById(client, 999999);

    expect(media).toBeNull();
  });

  it("should find all media for product variant", async () => {
    await repository.create(
      client,
      productVariantId,
      "photo",
      "products/test/photo-1.webp",
      "Photo 1",
      1,
      false,
    );

    await repository.create(
      client,
      productVariantId,
      "photo",
      "products/test/photo-2.webp",
      "Photo 2",
      0,
      true,
    );

    await repository.create(
      client,
      productVariantId,
      "video",
      "products/test/video.mp4",
      "Video 1",
      2,
      false,
    );

    const media = await repository.findByProductVariantId(
      client,
      productVariantId,
    );

    expect(media).toHaveLength(3);

    expect(media[0]?.sortOrder).toBe(0);
    expect(media[1]?.sortOrder).toBe(1);
    expect(media[2]?.sortOrder).toBe(2);

    expect(media[0]?.type).toBe("photo");
    expect(media[1]?.type).toBe("photo");
    expect(media[2]?.type).toBe("video");
  });

  it("should return empty array when product variant has no media", async () => {
    const media = await repository.findByProductVariantId(
      client,
      productVariantId,
    );

    expect(media).toEqual([]);
  });

  it("should update product variant media", async () => {
    const created = await repository.create(
      client,
      productVariantId,
      "photo",
      "products/test/old.webp",
      "Old photo",
      0,
      false,
    );

    const updated = await repository.update(
      client,
      created.id,
      "Updated video",
      1,
      false,
    );

    expect(updated).not.toBeNull();
    expect(updated?.id).toBe(created.id);
    expect(updated?.productVariantId).toBe(productVariantId);
    expect(updated?.type).toBe("photo");
    expect(updated?.url).toBe("products/test/old.webp");
    expect(updated?.alt).toBe("Updated video");
    expect(updated?.sortOrder).toBe(1);
    expect(updated?.isPrimary).toBe(false);
  });

  it("should return null when updating non-existing media", async () => {
    const updated = await repository.update(
      client,
      999999,
      "Test photo",
      0,
      false,
    );

    expect(updated).toBeNull();
  });

  it("should delete product variant media", async () => {
    const created = await repository.create(
      client,
      productVariantId,
      "photo",
      "products/test/photo.webp",
      "Test photo",
      0,
      false,
    );

    const deleted = await repository.delete(client, created.id);

    expect(deleted).toBe(true);

    const media = await repository.findById(client, created.id);

    expect(media).toBeNull();
  });

  it("should return false when deleting non-existing media", async () => {
    const deleted = await repository.delete(client, 999999);

    expect(deleted).toBe(false);
  });
});
