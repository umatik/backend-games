import type { PoolClient } from "pg";
import type {
  CreateInventoryData,
  Inventory,
  UpdateInventoryData,
} from "../types/product.types.js";

export interface InventoryRepository {
  create(client: PoolClient, data: CreateInventoryData): Promise<Inventory>;

  findByProductId(
    client: PoolClient,
    productId: number,
  ): Promise<Inventory | null>;

  update(
    client: PoolClient,
    productId: number,
    data: UpdateInventoryData,
  ): Promise<Inventory | null>;
}
