import type { PoolClient } from "pg";
import type {
  CreateOrderData,
  CreateOrderItemData,
  Order,
  OrderDetails,
} from "../../types/order.types.js";

export interface OrderInterface {
  create(client: PoolClient, data: CreateOrderData): Promise<Order>;

  findAll(
    client: PoolClient,
    page: number,
    limit: number,
  ): Promise<OrderDetails[]>;

  createItems(
    client: PoolClient,
    orderId: number,
    items: CreateOrderItemData[],
  ): Promise<void>;

  findUserById(client: PoolClient, userId: number): Promise<boolean>;

  findByUserId(client: PoolClient, userId: number): Promise<OrderDetails[]>;

  findById(
    client: PoolClient,
    orderId: number,
    userId: number,
  ): Promise<OrderDetails | null>;

  countAll(client: PoolClient): Promise<number>;

  delete(
    client: PoolClient,
    orderId: number,
    userId?: number,
  ): Promise<boolean>;
}
