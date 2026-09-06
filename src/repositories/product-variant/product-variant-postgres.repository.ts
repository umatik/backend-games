import type { PoolClient } from "pg";
import type { ProductVariantRepository } from "./product-variant.interface.js";
import type {
  CreateProductVariantData,
  ProductVariant,
  UpdateProductVariantData,
} from "../../types/product-variant.types.js";

export class PostgresProductVariantRepository implements ProductVariantRepository {
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
          price
        )
        VALUES ($1, $2, $3, $4)
        RETURNING
          id,
          product_id AS "productId",
          color,
          size,
          price,
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `,
      [data.productId, data.color, data.size, data.price],
    );

    const variant = result.rows[0];

    if (!variant) {
      throw new Error("Product variant was not created");
    }

    return variant;
  }

  async findById(
    client: PoolClient,
    id: number,
  ): Promise<ProductVariant | null> {
    const result = await client.query<ProductVariant>(
      `
        SELECT
          id,
          product_id AS "productId",
          color,
          size,
          price,
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM product_variants
        WHERE id = $1
      `,
      [id],
    );

    return result.rows[0] ?? null;
  }

  async findByProductId(
    client: PoolClient,
    productId: number,
  ): Promise<ProductVariant[]> {
    const result = await client.query<ProductVariant>(
      `
        SELECT
          id,
          product_id AS "productId",
          color,
          size,
          price,
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM product_variants
        WHERE product_id = $1
        ORDER BY id
      `,
      [productId],
    );

    return result.rows;
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
        RETURNING
          id,
          product_id AS "productId",
          color,
          size,
          price,
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `,
      values,
    );

    return result.rows[0] ?? null;
  }

  async delete(client: PoolClient, id: number): Promise<boolean> {
    const result = await client.query(
      `
        DELETE FROM product_variants
        WHERE id = $1
      `,
      [id],
    );

    return result.rowCount === 1;
  }
}
