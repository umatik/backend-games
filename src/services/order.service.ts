import { pool } from "../database/db.js";
import { UserNotFoundError } from "../errors/user-not-found.error.js";
import type { CreateOrderData, Order } from "../types/order.types.js";
import type { OrderInterface } from "../repositories/order/order.interface.js";

export class OrderService {
  constructor(private orderRepository: OrderInterface) {}

  async createOrder(data: CreateOrderData): Promise<Order> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const userExists = await this.orderRepository.findUserById(
        client,
        data.userId,
      );

      if (!userExists) {
        throw new UserNotFoundError(data.userId);
      }

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
