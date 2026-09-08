import type { PoolClient } from "pg";
import type {
  CreateOrderData,
  CreateOrderItemData,
  Order,
  OrderDetails,
} from "../../types/order.types.js";

export interface OrderInterface {
  create(client: PoolClient, data: CreateOrderData): Promise<Order>;

  createItems(
    client: PoolClient,
    orderId: string,
    items: CreateOrderItemData[],
  ): Promise<void>;

  findUserById(client: PoolClient, userId: string): Promise<boolean>;

  findByUserId(client: PoolClient, userId: string): Promise<OrderDetails[]>;

  findById(
    client: PoolClient,
    orderId: string,
    userId: string,
  ): Promise<OrderDetails | null>;
}
