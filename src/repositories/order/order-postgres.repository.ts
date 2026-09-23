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
  async countAll(client: PoolClient): Promise<number> {
    const result = await client.query(
      `
        SELECT COUNT(*) AS total
        FROM orders
        WHERE is_deleted = FALSE
      `,
    );

    return Number(result.rows[0].total);
  }

  private mapOrderRows(rows: OrderRow[]): OrderDetails[] {
    const orders = new Map<number, OrderDetails>();

    for (const row of rows) {
      const orderId = Number(row.orderId);

      let order = orders.get(orderId);

      if (!order) {
        const newOrder: OrderDetails = {
          id: orderId,
          userId: Number(row.userId),
          status: row.status,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          items: [],
        };

        orders.set(orderId, newOrder);
        order = newOrder;
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

  async findUserById(client: PoolClient, userId: number): Promise<boolean> {
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
      id: Number(row.id),
      userId: Number(row.user_id),
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async createItems(
    client: PoolClient,
    orderId: number,
    items: CreateOrderItemData[],
  ): Promise<void> {
    const sortedItems = [...items].sort(
      (a, b) => a.productVariantId - b.productVariantId,
    );

    for (const item of sortedItems) {
      const productVariantResult = await client.query(
        `
          SELECT pv.id,
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
          INSERT INTO order_items (order_id,
                                   product_variant_id,
                                   quantity,
                                   price)
          VALUES ($1, $2, $3, $4)
        `,
        [orderId, item.productVariantId, item.quantity, price],
      );
    }
  }

  async findAll(
    client: PoolClient,
    page: number,
    limit: number,
  ): Promise<OrderDetails[]> {
    const offset = (page - 1) * limit;

    const result = await client.query(
      `
        SELECT o.id                  AS "orderId",
               o.user_id             AS "userId",
               o.status,
               o.created_at          AS "createdAt",
               o.updated_at          AS "updatedAt",

               oi.id                 AS "itemId",
               oi.product_variant_id AS "productVariantId",
               oi.quantity,
               oi.price,

               pv.product_id         AS "productId",
               p.name                AS "productName",
               pv.color,
               pv.size

        FROM (SELECT id,
                     user_id,
                     status,
                     created_at,
                     updated_at
              FROM orders
              WHERE is_deleted = FALSE
              ORDER BY id DESC
              LIMIT $1 OFFSET $2) o
               JOIN order_items oi
                    ON oi.order_id = o.id
               JOIN product_variants pv
                    ON pv.id = oi.product_variant_id
               JOIN products p
                    ON p.id = pv.product_id

        ORDER BY o.id DESC, oi.id
      `,
      [limit, offset],
    );

    return this.mapOrderRows(result.rows);
  }

  async findByUserId(
    client: PoolClient,
    userId: number,
  ): Promise<OrderDetails[]> {
    const result = await client.query(
      `
        SELECT o.id                  AS "orderId",
               o.user_id             AS "userId",
               o.status,
               o.created_at          AS "createdAt",
               o.updated_at          AS "updatedAt",

               oi.id                 AS "itemId",
               oi.product_variant_id AS "productVariantId",
               oi.quantity,
               oi.price,

               pv.product_id         AS "productId",
               p.name                AS "productName",
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
          AND o.is_deleted = FALSE

        ORDER BY o.id DESC, oi.id
      `,
      [userId],
    );

    return this.mapOrderRows(result.rows);
  }

  async findById(
    client: PoolClient,
    orderId: number,
    userId: number,
  ): Promise<OrderDetails | null> {
    const result = await client.query(
      `
        SELECT o.id                  AS "orderId",
               o.user_id             AS "userId",
               o.status,
               o.created_at          AS "createdAt",
               o.updated_at          AS "updatedAt",

               oi.id                 AS "itemId",
               oi.product_variant_id AS "productVariantId",
               oi.quantity,
               oi.price,

               pv.product_id         AS "productId",
               p.name                AS "productName",
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
          AND o.is_deleted = FALSE

        ORDER BY oi.id
      `,
      [orderId, userId],
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapOrderRows(result.rows)[0] ?? null;
  }

  async delete(
    client: PoolClient,
    orderId: number,
    userId?: number,
  ): Promise<boolean> {
    const orderResult = await client.query(
      `
        SELECT id, status
        FROM orders
        WHERE id = $1
          AND ($2::BIGINT IS NULL OR user_id = $2)
          AND is_deleted = FALSE
          FOR UPDATE
      `,
      [orderId, userId ?? null],
    );

    const order = orderResult.rows[0];

    if (!order) {
      return false;
    }

    const shouldRestoreStock =
      order.status === "pending" || order.status === "paid";

    if (shouldRestoreStock) {
      await client.query(
        `
          UPDATE product_variants pv
          SET quantity = pv.quantity + stock.quantity
          FROM (SELECT product_variant_id,
                       SUM(quantity) AS quantity
                FROM order_items
                WHERE order_id = $1
                GROUP BY product_variant_id) stock
          WHERE pv.id = stock.product_variant_id
        `,
        [orderId],
      );
    }

    const result = await client.query(
      `
        UPDATE orders
        SET status = CASE
                       WHEN status IN ('pending', 'paid')
                         THEN 'cancelled'
                       ELSE status
                     END,
            is_deleted = TRUE,
            deleted_at = NOW(),
            updated_at = NOW()
        WHERE id = $1
          AND is_deleted = FALSE
      `,
      [orderId],
    );

    return result.rowCount === 1;
  }
}
