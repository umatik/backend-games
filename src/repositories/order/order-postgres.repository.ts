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
      const productVariantResult = await client.query(
        `
          SELECT pv.id, pv.product_id, pv.price
          FROM product_variants pv
                 JOIN products p ON p.id = pv.product_id
          WHERE pv.id = $1
            AND p.is_deleted = FALSE
        `,
        [item.productVariantId],
      );

      if (productVariantResult.rows.length === 0) {
        throw new ProductNotFoundError(item.productVariantId);
      }

      const price = Number(productVariantResult.rows[0].price);

      const stockResult = await client.query(
        `
          UPDATE product_variants
          SET quantity = quantity - $1
          WHERE id = $2
            AND quantity >= $1
          RETURNING quantity
        `,
        [item.quantity, item.productVariantId],
      );

      if (stockResult.rows.length === 0) {
        throw new InsufficientStockError(item.productVariantId);
      }

      await client.query(
        `
          INSERT INTO order_items (
            order_id,
            product_variant_id,
            quantity,
            price
          )
          VALUES ($1, $2, $3, $4)
        `,
        [orderId, item.productVariantId, item.quantity, price],
      );
    }
  }
}
