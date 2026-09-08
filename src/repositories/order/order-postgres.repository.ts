import type { OrderInterface } from "./order.interface.js";
import type { PoolClient } from "pg";
import type {
  CreateOrderData,
  CreateOrderItemData,
  Order,
  OrderDetails,
  OrderItem,
  OrderRow,
} from "../../types/order.types.js";
import { ProductNotFoundError } from "../../errors/product-not-found.error.js";
import { InsufficientStockError } from "../../errors/insufficient-stock.error.js";

export class OrderPostgresRepository implements OrderInterface {
  private mapOrderRows(rows: OrderRow[]): OrderDetails[] {
    const orders = new Map<string, OrderDetails>();

    for (const row of rows) {
      const orderId = String(row.orderId);

      let order = orders.get(orderId);

      if (!order) {
        order = {
          id: orderId,
          userId: String(row.userId),
          status: row.status,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          items: [],
        };

        orders.set(orderId, order);
      }

      if (row.itemId !== null) {
        const item: OrderItem = {
          id: Number(row.itemId),
          productVariantId: Number(row.productVariantId),
          quantity: Number(row.quantity),
          price: Number(row.price),
          productId: Number(row.productId),
          productName: row.productName,
          color: row.color,
          size: row.size,
        };

        order.items.push(item);
      }
    }

    return Array.from(orders.values());
  }

  async findUserById(client: PoolClient, userId: string): Promise<boolean> {
    const result = await client.query(
      `
        SELECT id
        FROM users
        WHERE id = $1
          AND is_deleted = FALSE
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
        RETURNING
          id,
          user_id,
          status,
          created_at,
          updated_at
      `,
      [data.userId],
    );

    const row = result.rows[0];

    if (!row) {
      throw new Error("Order was not created");
    }

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
          SELECT
            pv.id,
            pv.product_id,
            pv.price
          FROM product_variants pv
                 JOIN products p ON p.id = pv.product_id
          WHERE pv.id = $1
            AND pv.is_deleted = FALSE
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
            AND is_deleted = FALSE
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

  async findByUserId(
    client: PoolClient,
    userId: string,
  ): Promise<OrderDetails[]> {
    const result = await client.query(
      `
        SELECT
          o.id AS "orderId",
          o.user_id AS "userId",
          o.status,
          o.created_at AS "createdAt",
          o.updated_at AS "updatedAt",

          oi.id AS "itemId",
          oi.product_variant_id AS "productVariantId",
          oi.quantity,
          oi.price,

          pv.product_id AS "productId",
          p.name AS "productName",
          pv.color,
          pv.size

        FROM orders o
        JOIN order_items oi
          ON oi.order_id = o.id
        JOIN product_variants pv
          ON pv.id = oi.product_variant_id
        JOIN products p
          ON p.id = pv.product_id

        WHERE o.user_id = $1

        ORDER BY o.id DESC, oi.id
      `,
      [userId],
    );

    return this.mapOrderRows(result.rows);
  }

  async findById(
    client: PoolClient,
    orderId: string,
    userId: string,
  ): Promise<OrderDetails | null> {
    const result = await client.query(
      `
        SELECT
          o.id AS "orderId",
          o.user_id AS "userId",
          o.status,
          o.created_at AS "createdAt",
          o.updated_at AS "updatedAt",

          oi.id AS "itemId",
          oi.product_variant_id AS "productVariantId",
          oi.quantity,
          oi.price,

          pv.product_id AS "productId",
          p.name AS "productName",
          pv.color,
          pv.size

        FROM orders o
        JOIN order_items oi
          ON oi.order_id = o.id
        JOIN product_variants pv
          ON pv.id = oi.product_variant_id
        JOIN products p
          ON p.id = pv.product_id

        WHERE o.id = $1
          AND o.user_id = $2

        ORDER BY oi.id
      `,
      [orderId, userId],
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapOrderRows(result.rows)[0] ?? null;
  }
}
