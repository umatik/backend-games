import type { PoolClient } from "pg";
import type { ProductVariantRepository } from "./product-variant.interface.js";
import type {
  CreateProductVariantData,
  ProductVariant,
  UpdateProductVariantData,
} from "../../types/product-variant.types.js";

export class PostgresProductVariantRepository implements ProductVariantRepository {
  private mapProductVariantRow(row: ProductVariant): ProductVariant {
    return {
      ...row,
      id: Number(row.id),
      productId: Number(row.productId),
      price: Number(row.price),
      quantity: Number(row.quantity),
    };
  }

  async create(
    client: PoolClient,
    data: CreateProductVariantData,
  ): Promise<ProductVariant> {
    const result = await client.query<ProductVariant>(
      `
        INSERT INTO product_variants (product_id,
                                      color,
                                      size,
                                      price,
                                      quantity)
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
    const result = await client.query<ProductVariant>(
      `
        SELECT id,
               product_id AS "productId",
               color,
               size,
               price,
               quantity,
               is_deleted AS "isDeleted",
               created_at AS "createdAt",
               updated_at AS "updatedAt",
               deleted_at AS "deletedAt"
        FROM product_variants
        WHERE id = $1
          AND is_deleted = FALSE
      `,
      [id],
    );

    return result.rows[0] ? this.mapProductVariantRow(result.rows[0]) : null;
  }

  async findByProductId(
    client: PoolClient,
    productId: number,
  ): Promise<ProductVariant[]> {
    const result = await client.query<ProductVariant>(
      `
        SELECT id,
               product_id AS "productId",
               color,
               size,
               price,
               quantity,
               is_deleted AS "isDeleted",
               created_at AS "createdAt",
               updated_at AS "updatedAt",
               deleted_at AS "deletedAt"
        FROM product_variants
        WHERE product_id = $1
          AND is_deleted = FALSE
        ORDER BY id
      `,
      [productId],
    );

    return result.rows.map((row) => this.mapProductVariantRow(row));
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
        SET is_deleted = TRUE,
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
