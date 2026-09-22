import {UserNotFoundError} from "../errors/user-not-found.error.js";
import type {
  CreateOrderData,
  Order,
  OrderDetails,
} from "../types/order.types.js";
import type {OrderInterface} from "../repositories/order/order.interface.js";
import type {PoolClient} from "pg";

export type Database = {
  connect(): Promise<PoolClient>;
};

export class OrderService {
  constructor(
    private orderRepository: OrderInterface,
    private pool: Database,
  ) {
  }

  async createOrder(data: CreateOrderData): Promise<Order> {
    const client = await this.pool.connect();

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
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Rollback failed:", rollbackError);
      }

      throw error;
    } finally {
      client.release();
    }
  }

  async getOrders(
    page: number,
    limit: number,
  ): Promise<{
    orders: OrderDetails[];
    total: number;
  }> {
    const client = await this.pool.connect();

    try {
      const orders = await this.orderRepository.findAll(
        client,
        page,
        limit,
      );

      const total = await this.orderRepository.countAll(client);

      return {
        orders,
        total,
      };
    } finally {
      client.release();
    }
  }

  async getOrdersByUserId(userId: number): Promise<OrderDetails[]> {
    const client = await this.pool.connect();

    try {
      return await this.orderRepository.findByUserId(client, userId);
    } finally {
      client.release();
    }
  }

  async getOrderById(
    orderId: number,
    userId: number,
  ): Promise<OrderDetails | null> {
    const client = await this.pool.connect();

    try {
      return await this.orderRepository.findById(client, orderId, userId);
    } finally {
      client.release();
    }
  }

  async deleteOrder(orderId: number, userId: number): Promise<boolean> {
    const client = await this.pool.connect();

    try {
      return await this.orderRepository.delete(client, orderId, userId);
    } finally {
      client.release();
    }
  }
}