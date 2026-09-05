import { pool } from "../database/db.js";
import type { OrderRepository } from "../repositories/order.repository.js";
import type { CreateOrderData, Order } from "../types/order.types.js";

export class OrderService {
  constructor(private orderRepository: OrderRepository) {}

  async createOrder(data: CreateOrderData): Promise<Order> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const order = await this.orderRepository.create(client, data);

      await this.orderRepository.createItems(client, order.id, data.items);

      await client.query("COMMIT");

      return order;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
