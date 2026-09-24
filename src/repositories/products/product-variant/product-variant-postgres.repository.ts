import type { PoolClient } from "pg";
import type { ProductVariantRepository } from "./product-variant.interface.js";
import type {
  CreateProductVariantData,
  ProductVariant,
  UpdateProductVariantData,
} from "@/types/product-variant.types.js";

type ProductVariantRow = ProductVariant & {
  mediaId: number | null;
  mediaProductVariantId: number | null;
  mediaType: ProductVariant["media"][number]["type"] | null;
  mediaUrl: string | null;
  mediaAlt: string | null;
  mediaSortOrder: number | null;
  mediaIsPrimary: boolean | null;
  mediaCreatedAt: Date | null;
  mediaUpdatedAt: Date | null;
};

export class PostgresProductVariantRepository implements ProductVariantRepository {
  private mapProductVariantRow(row: ProductVariant): ProductVariant {
    return {
      id: Number(row.id),
      productId: Number(row.productId),
      color: row.color,
      size: row.size,
      media: [],
      price: Number(row.price),
      quantity: Number(row.quantity),
      isDeleted: row.isDeleted,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
    };
  }

  private mapProductVariantMediaRow(
    row: ProductVariantRow,
  ): ProductVariant["media"][number] | null {
    if (row.mediaId === null) {
      return null;
    }

    return {
      id: Number(row.mediaId),
      productVariantId: Number(row.mediaProductVariantId),
      type: row.mediaType!,
      url: row.mediaUrl!,
      alt: row.mediaAlt,
      sortOrder: Number(row.mediaSortOrder),
      isPrimary: row.mediaIsPrimary!,
      createdAt: row.mediaCreatedAt!,
      updatedAt: row.mediaUpdatedAt!,
    };
  }

  async create(
    client: PoolClient,
    data: CreateProductVariantData,
  ): Promise<ProductVariant> {
    const result = await client.query<ProductVariant>(
      `
        INSERT INTO product_variants (
          product_id,
          color,
          size,
          price,
          quantity
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING
          id,
          product_id AS "productId",
          color,
          size,
          price,
          quantity,
          is_deleted AS "isDeleted",
          created_at AS "createdAt",
          updated_at AS "updatedAt",
          deleted_at AS "deletedAt"
      `,
      [data.productId, data.color, data.size, data.price, data.quantity],
    );

    const variant = result.rows[0];

    if (!variant) {
      throw new Error("Product variant was not created");
    }

    return this.mapProductVariantRow(variant);
  }

  async findById(
    client: PoolClient,
    id: number,
  ): Promise<ProductVariant | null> {
    const result = await client.query<ProductVariantRow>(
      `
        SELECT
          pv.id,
          pv.product_id AS "productId",
          pv.color,
          pv.size,
          pv.price,
          pv.quantity,
          pv.is_deleted AS "isDeleted",
          pv.created_at AS "createdAt",
          pv.updated_at AS "updatedAt",
          pv.deleted_at AS "deletedAt",

          pvm.id AS "mediaId",
          pvm.product_variant_id AS "mediaProductVariantId",
          pvm.type AS "mediaType",
          pvm.url AS "mediaUrl",
          pvm.alt AS "mediaAlt",
          pvm.sort_order AS "mediaSortOrder",
          pvm.is_primary AS "mediaIsPrimary",
          pvm.created_at AS "mediaCreatedAt",
          pvm.updated_at AS "mediaUpdatedAt"

        FROM product_variants pv

               LEFT JOIN product_variant_media pvm
                         ON pvm.product_variant_id = pv.id

        WHERE pv.id = $1
          AND pv.is_deleted = FALSE

        ORDER BY pvm.sort_order
      `,
      [id],
    );

    const row = result.rows[0];

    if (!row) {
      return null;
    }

    const variant = this.mapProductVariantRow(row);

    for (const row of result.rows) {
      const media = this.mapProductVariantMediaRow(row);

      if (media) {
        variant.media.push(media);
      }
    }

    return variant;
  }

  async findByProductId(
    client: PoolClient,
    productId: number,
  ): Promise<ProductVariant[]> {
    const result = await client.query<ProductVariantRow>(
      `
        SELECT
          pv.id,
          pv.product_id AS "productId",
          pv.color,
          pv.size,
          pv.price,
          pv.quantity,
          pv.is_deleted AS "isDeleted",
          pv.created_at AS "createdAt",
          pv.updated_at AS "updatedAt",
          pv.deleted_at AS "deletedAt",

          pvm.id AS "mediaId",
          pvm.product_variant_id AS "mediaProductVariantId",
          pvm.type AS "mediaType",
          pvm.url AS "mediaUrl",
          pvm.alt AS "mediaAlt",
          pvm.sort_order AS "mediaSortOrder",
          pvm.is_primary AS "mediaIsPrimary",
          pvm.created_at AS "mediaCreatedAt",
          pvm.updated_at AS "mediaUpdatedAt"

        FROM product_variants pv

               LEFT JOIN product_variant_media pvm
                         ON pvm.product_variant_id = pv.id

        WHERE pv.product_id = $1
          AND pv.is_deleted = FALSE

        ORDER BY
          pv.id,
          pvm.sort_order
      `,
      [productId],
    );

    const variants = new Map<number, ProductVariant>();

    for (const row of result.rows) {
      const variantId = Number(row.id);

      let variant = variants.get(variantId);

      if (!variant) {
        variant = this.mapProductVariantRow(row);
        variants.set(variantId, variant);
      }

      const media = this.mapProductVariantMediaRow(row);

      if (media) {
        variant.media.push(media);
      }
    }

    return Array.from(variants.values());
  }

  async update(
    client: PoolClient,
    id: number,
    data: UpdateProductVariantData,
  ): Promise<ProductVariant | null> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.color !== undefined) {
      fields.push(`color = $${values.length + 1}`);
      values.push(data.color);
    }

    if (data.size !== undefined) {
      fields.push(`size = $${values.length + 1}`);
      values.push(data.size);
    }

    if (data.price !== undefined) {
      fields.push(`price = $${values.length + 1}`);
      values.push(data.price);
    }

    if (data.quantity !== undefined) {
      fields.push(`quantity = $${values.length + 1}`);
      values.push(data.quantity);
    }

    if (fields.length === 0) {
      return this.findById(client, id);
    }

    fields.push("updated_at = CURRENT_TIMESTAMP");

    values.push(id);

    const result = await client.query<ProductVariant>(
      `
        UPDATE product_variants
        SET ${fields.join(", ")}
        WHERE id = $${values.length}
          AND is_deleted = FALSE
        RETURNING
          id,
          product_id AS "productId",
          color,
          size,
          price,
          quantity,
          is_deleted AS "isDeleted",
          created_at AS "createdAt",
          updated_at AS "updatedAt",
          deleted_at AS "deletedAt"
      `,
      values,
    );

    return result.rows[0] ? this.mapProductVariantRow(result.rows[0]) : null;
  }

  async delete(client: PoolClient, id: number): Promise<boolean> {
    const result = await client.query(
      `
        UPDATE product_variants
        SET
          is_deleted = TRUE,
          deleted_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
          AND is_deleted = FALSE
      `,
      [id],
    );

    return result.rowCount === 1;
  }
}
