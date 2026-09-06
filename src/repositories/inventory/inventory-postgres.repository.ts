import type { PoolClient } from "pg";
import type { InventoryRepository } from "./inventory.repository.js";
import type {
  CreateInventoryData,
  Inventory,
  UpdateInventoryData,
} from "../types/product.types.js";

export class PostgresInventoryRepository implements InventoryRepository {
  async create(
    client: PoolClient,
    data: CreateInventoryData,
  ): Promise<Inventory> {
    const result = await client.query<Inventory>(
      `
        INSERT INTO inventory (
          product_id,
          quantity
        )
        VALUES ($1, $2)
        RETURNING
          product_id AS "productId",
          quantity
      `,
      [data.productId, data.quantity],
    );

    const inventory = result.rows[0];

    if (!inventory) {
      throw new Error("Inventory was not created");
    }

    return inventory;
  }

  async findByProductId(
    client: PoolClient,
    productId: number,
  ): Promise<Inventory | null> {
    const result = await client.query<Inventory>(
      `
        SELECT
          product_id AS "productId",
          quantity
        FROM inventory
        WHERE product_id = $1
      `,
      [productId],
    );

    return result.rows[0] ?? null;
  }

  async update(
    client: PoolClient,
    productId: number,
    data: UpdateInventoryData,
  ): Promise<Inventory | null> {
    const result = await client.query<Inventory>(
      `
        UPDATE inventory
        SET quantity = $1
        WHERE product_id = $2
        RETURNING
          product_id AS "productId",
          quantity
      `,
      [data.quantity, productId],
    );

    return result.rows[0] ?? null;
  }
}
