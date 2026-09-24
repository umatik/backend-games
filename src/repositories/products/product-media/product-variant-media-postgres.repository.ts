import type { PoolClient } from "pg";

import type { ProductVariantMediaType } from "@/types/product-variant-media.types.js";
import type {
  ProductVariantMedia,
  ProductVariantMediaInterface,
} from "@/repositories/products/product-media/product-variant-media.interface.js";

export class ProductVariantMediaPostgresRepository implements ProductVariantMediaInterface {
  async findByProductVariantId(
    client: PoolClient,
    productVariantId: number,
  ): Promise<ProductVariantMedia[]> {
    const result = await client.query<ProductVariantMedia>(
      `
        SELECT
          id,
          product_variant_id AS "productVariantId",
          type,
          url,
          alt,
          sort_order AS "sortOrder",
          is_primary AS "isPrimary",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM product_variant_media
        WHERE product_variant_id = $1
        ORDER BY sort_order ASC, id ASC
      `,
      [productVariantId],
    );

    return result.rows;
  }

  async findById(
    client: PoolClient,
    mediaId: number,
  ): Promise<ProductVariantMedia | null> {
    const result = await client.query<ProductVariantMedia>(
      `
        SELECT
          id,
          product_variant_id AS "productVariantId",
          type,
          url,
          alt,
          sort_order AS "sortOrder",
          is_primary AS "isPrimary",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM product_variant_media
        WHERE id = $1
      `,
      [mediaId],
    );

    return result.rows[0] ?? null;
  }

  async create(
    client: PoolClient,
    productVariantId: number,
    type: ProductVariantMediaType,
    url: string,
    alt: string | null,
    sortOrder: number,
    isPrimary: boolean,
  ): Promise<ProductVariantMedia> {
    const result = await client.query<ProductVariantMedia>(
      `
        INSERT INTO product_variant_media (
          product_variant_id,
          type,
          url,
          alt,
          sort_order,
          is_primary
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING
          id,
          product_variant_id AS "productVariantId",
          type,
          url,
          alt,
          sort_order AS "sortOrder",
          is_primary AS "isPrimary",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `,
      [productVariantId, type, url, alt, sortOrder, isPrimary],
    );

    const media = result.rows[0];

    if (!media) {
      throw new Error("Failed to create product variant media");
    }

    return media;
  }

  async update(
    client: PoolClient,
    mediaId: number,
    alt: string | null,
    sortOrder: number,
    isPrimary: boolean,
  ): Promise<ProductVariantMedia | null> {
    const result = await client.query<ProductVariantMedia>(
      `
        UPDATE product_variant_media
        SET
          alt = $1,
          sort_order = $2,
          is_primary = $3,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
        RETURNING
          id,
          product_variant_id AS "productVariantId",
          type,
          url,
          alt,
          sort_order AS "sortOrder",
          is_primary AS "isPrimary",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `,
      [alt, sortOrder, isPrimary, mediaId],
    );

    return result.rows[0] ?? null;
  }

  async delete(client: PoolClient, mediaId: number): Promise<boolean> {
    const result = await client.query(
      `
        DELETE FROM product_variant_media
        WHERE id = $1
      `,
      [mediaId],
    );

    return result.rowCount === 1;
  }
}
