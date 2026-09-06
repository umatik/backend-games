import type { PoolClient } from "pg";
import type { InventoryRepository } from "./inventory.interface.js";
import type {
  CreateInventoryData,
  Inventory,
  UpdateInventoryData,
} from "../../types/inventory.types.js";

export class PostgresInventoryRepository implements InventoryRepository {
  async create(
    client: PoolClient,
    data: CreateInventoryData,
  ): Promise<Inventory> {
    const result = await client.query<Inventory>(
      `
        INSERT INTO inventory (
          product_variant_id,
          quantity
        )
        VALUES ($1, $2)
        RETURNING
          product_variant_id AS "productVariantId",
          quantity
      `,
      [data.productVariantId, data.quantity],
    );

    const inventory = result.rows[0];

    if (!inventory) {
      throw new Error("Inventory was not created");
    }

    return inventory;
  }

  async findByProductVariantId(
    client: PoolClient,
    productVariantId: number,
  ): Promise<Inventory | null> {
    const result = await client.query<Inventory>(
      `
        SELECT
          product_variant_id AS "productVariantId",
          quantity
        FROM inventory
        WHERE product_variant_id = $1
      `,
      [productVariantId],
    );

    return result.rows[0] ?? null;
  }

  async update(
    client: PoolClient,
    productVariantId: number,
    data: UpdateInventoryData,
  ): Promise<Inventory | null> {
    const result = await client.query<Inventory>(
      `
        UPDATE inventory
        SET quantity = $1
        WHERE product_variant_id = $2
        RETURNING
          product_variant_id AS "productVariantId",
          quantity
      `,
      [data.quantity, productVariantId],
    );

    return result.rows[0] ?? null;
  }
}
