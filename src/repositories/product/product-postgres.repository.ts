import type {
  CreateProductData,
  Product,
  ProductRow,
  UpdateProductData,
} from "../../types/product.types.js";
import { pool } from "../../database/db.js";
import type { PoolClient } from "pg";
import type { ProductRepository } from "./product.interface.js";

export class PostgresProductRepository implements ProductRepository {
  private mapProductRow = (row: ProductRow): Product => ({
    id: Number(row.id),
    name: row.name,
    is_deleted: row.is_deleted,
    updated_at: row.updated_at,
    created_at: row.created_at,
    deleted_at: row.deleted_at,
  });

  async create(client: PoolClient, data: CreateProductData): Promise<Product> {
    const result = await client.query(
      `
        INSERT INTO products (name, created_at, updated_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id, name, is_deleted, created_at, deleted_at, updated_at
      `,
      [data.name],
    );

    return this.mapProductRow(result.rows[0]);
  }

  async findById(id: string): Promise<Product | null> {
    const result = await pool.query(
      `
        SELECT id, name, is_deleted, created_at, updated_at, deleted_at
        FROM products
        WHERE id = $1
          AND is_deleted = FALSE`,
      [id],
    );

    if (result.rows.length > 0) {
      return this.mapProductRow(result.rows[0]);
    }

    return null;
  }

  async findAll(): Promise<Product[]> {
    const result = await pool.query(`
        SELECT id, name, is_deleted, created_at, updated_at, deleted_at
        FROM products
        WHERE is_deleted = FALSE
      `);

    return result.rows.map((row) => this.mapProductRow(row));
  }

  async update(
    client: PoolClient,
    id: string,
    data: UpdateProductData,
  ): Promise<Product | null> {
    const result = await client.query(
      `
        UPDATE products
        SET
          name = COALESCE($1, name),
          updated_at = NOW()
        WHERE id = $2
          AND is_deleted = FALSE
        RETURNING id, name, is_deleted, created_at, updated_at, deleted_at
      `,
      [data.name, id],
    );

    if (result.rows.length > 0) {
      return this.mapProductRow(result.rows[0]);
    }

    return null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await pool.query(
      `
        UPDATE products
        SET
          is_deleted = TRUE,
          deleted_at = NOW(),
          updated_at = NOW()
        WHERE id = $1
          AND is_deleted = FALSE
        RETURNING id
    `,
      [id],
    );

    return result.rows.length > 0;
  }
}
