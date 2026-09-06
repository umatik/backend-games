import type {
  CreateProductData,
  Product,
  ProductRow,
  UpdateProductData,
} from "../types/product.types.js";
import type { ProductRepository } from "./product.repository.js";
import { pool } from "../database/db.js";
import type { PoolClient } from "pg";

export class PostgresProductRepository implements ProductRepository {
  private mapProductRow = (row: ProductRow): Product => ({
    id: Number(row.id),
    name: row.name,
    price: Number(row.price),
    is_deleted: row.is_deleted,
    updated_at: row.updated_at,
    created_at: row.created_at,
    deleted_at: row.deleted_at,
  });

  async create(client: PoolClient, data: CreateProductData): Promise<Product> {
    const result = await client.query(
      `
        INSERT INTO products (name, price, created_at, updated_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id, name, price, is_deleted, created_at, deleted_at, updated_at
      `,
      [data.name, data.price],
    );

    return this.mapProductRow(result.rows[0]);
  }

  async findById(id: string): Promise<Product | null> {
    const result = await pool.query(
      `
        SELECT id, name, price, is_deleted, created_at, updated_at, deleted_at
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
        SELECT id, name, price, is_deleted, created_at, updated_at, deleted_at
        FROM products
        WHERE is_deleted = FALSE
      `);

    return result.rows.map((row) => this.mapProductRow(row));
  }

  async update(id: string, data: UpdateProductData): Promise<Product | null> {
    const result = await pool.query(
      `
        UPDATE products
        SET
          name = COALESCE($1, name),
          price = COALESCE($2, price),
          updated_at = NOW()
        WHERE id = $3
          AND is_deleted = FALSE
        RETURNING id, name, price, is_deleted, created_at, updated_at, deleted_at
      `,
      [data.name, data.price, id],
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
