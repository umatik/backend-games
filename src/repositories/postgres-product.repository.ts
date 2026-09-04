import type {
  CreateProductData,
  Product,
  UpdateProductData,
} from "../types/product.types.js";
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

    return {
      id: String(result.rows[0].id),
      name: result.rows[0].name,
      price: Number(result.rows[0].price),
    };
  }
  async findById(id: string): Promise<Product | null> {
    const result = await pool.query(
      `SELECT id, name, price FROM products WHERE id = $1`,
      [id],
    );

    if (result.rows.length > 0) {
      return {
        id: String(result.rows[0].id),
        name: result.rows[0].name,
        price: Number(result.rows[0].price),
      };
    }

    return null;
  }

  async findAll(): Promise<Product[]> {
    const result = await pool.query(`SELECT id, name, price FROM products`);

    return result.rows.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      price: Number(row.price),
    }));
  }

  async update(id: string, data: UpdateProductData): Promise<Product | null> {
    const result = await pool.query(
      `
        UPDATE products
        SET
          name = COALESCE($1, name),
          price = COALESCE($2, price)
        WHERE id = $3
        RETURNING id, name, price
      `,
      [data.name, data.price, id],
    );

    if (result.rows.length > 0) {
      return {
        id: String(result.rows[0].id),
        name: result.rows[0].name,
        price: Number(result.rows[0].price),
      };
    }

    return null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await pool.query(
      `
    DELETE FROM products
    WHERE id = $1
    RETURNING id
    `,
      [id],
    );

    return result.rows.length > 0;
  }
}
