import type { OrderInterface } from "./order.interface.js";
import type { PoolClient } from "pg";
import type {
  CreateOrderData,
  CreateOrderItemData,
  Order,
} from "../../types/order.types.js";
import { ProductNotFoundError } from "../../errors/product-not-found.error.js";
import { InsufficientStockError } from "../../errors/insufficient-stock.error.js";

export class OrderPostgresRepository implements OrderInterface {
  async findUserById(client: PoolClient, userId: string): Promise<boolean> {
    const result = await client.query(
      `
        SELECT id
        FROM users
        WHERE id = $1
      `,
      [userId],
    );

    return result.rows.length > 0;
  }

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
      const productResult = await client.query(
        `
          SELECT id, price
          FROM products
          WHERE id = $1
            AND is_deleted = FALSE
        `,
        [item.productId],
      );

      if (productResult.rows.length === 0) {
        throw new ProductNotFoundError(item.productId);
      }

      const price = Number(productResult.rows[0].price);

      const inventoryResult = await client.query(
        `
          UPDATE inventory
          SET quantity = quantity - $1
          WHERE product_id = $2
            AND quantity >= $1
          RETURNING quantity
        `,
        [item.quantity, item.productId],
      );

      if (inventoryResult.rows.length === 0) {
        throw new InsufficientStockError(item.productId);
      }

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
