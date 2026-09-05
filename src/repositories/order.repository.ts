import type { PoolClient } from "pg";
import type {
  CreateOrderData,
  CreateOrderItemData,
  Order,
} from "../types/order.types.js";

export interface OrderRepository {
  create(client: PoolClient, data: CreateOrderData): Promise<Order>;

  createItems(
    client: PoolClient,
    orderId: string,
    items: CreateOrderItemData[],
  ): Promise<void>;
}
