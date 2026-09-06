import type { PoolClient } from "pg";
import type {
  CreateInventoryData,
  Inventory,
  UpdateInventoryData,
} from "../../types/inventory.types.js";

export interface InventoryRepository {
  create(client: PoolClient, data: CreateInventoryData): Promise<Inventory>;

  findByProductVariantId(
    client: PoolClient,
    productVariantId: number,
  ): Promise<Inventory | null>;

  update(
    client: PoolClient,
    productVariantId: number,
    data: UpdateInventoryData,
  ): Promise<Inventory | null>;
}
