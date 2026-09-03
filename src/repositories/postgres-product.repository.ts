import type { CreateProductData, Product } from "../types/product.types.js";
import type { ProductRepository } from "./product.repository.js";
import { pool } from "../database/db.js";

export class PostgresProductRepository implements ProductRepository {
  async create(data: CreateProductData): Promise<Product> {
    const result = await pool.query(
      `
      INSERT INTO products (name, price)
      VALUES ($1, $2)
      RETURNING id, name, price
    `,
      [data.name, data.price],
    );

    return result.rows[0];
  }
}
