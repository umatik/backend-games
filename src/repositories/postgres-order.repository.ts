import type {
  CreateOrderData,
  CreateOrderItemData,
  Order,
} from "../types/order.types.js";
import type { OrderRepository } from "./order.repository.js";
import type { PoolClient } from "pg";
import { ProductNotFoundError } from "../errors/product-not-found.error.js";

export class PostgresOrderRepository implements OrderRepository {
  async create(client: PoolClient, data: CreateOrderData): Promise<Order> {
    const result = await client.query(
      `
        INSERT INTO orders (user_id, status)
        VALUES ($1, 'pending')
        RETURNING id, user_id, status, created_at, updated_at
      `,
      [data.userId],
    );

    const row = result.rows[0];

    return {
      id: String(row.id),
      userId: String(row.user_id),
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async createItems(
    client: PoolClient,
    orderId: string,
    items: CreateOrderItemData[],
  ): Promise<void> {
    for (const item of items) {
      const result = await client.query(
        `
        SELECT price
        FROM products
        WHERE id = $1
          AND is_deleted = FALSE
      `,
        [item.productId],
      );

      if (result.rows.length === 0) {
        throw new ProductNotFoundError(item.productId);
      }

      const price = Number(result.rows[0].price);

      await client.query(
        `
        INSERT INTO order_items (order_id, product_id, quantity, price)
        VALUES ($1, $2, $3, $4)
      `,
        [orderId, item.productId, item.quantity, price],
      );
    }
  }
}
