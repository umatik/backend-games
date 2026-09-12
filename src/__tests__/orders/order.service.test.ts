import { beforeEach, describe, jest, it, expect } from "@jest/globals";
import type { PoolClient } from "pg";
import { OrderService } from "../../services/order.service.js";
import type { OrderInterface } from "../../repositories/order/order.interface.js";
import type { Database } from "../../services/order.service.js";
import type {
  CreateOrderData,
  Order,
  OrderDetails,
} from "../../types/order.types.js";

const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

describe("OrderService", () => {
  let orderService: OrderService;
  let orderRepository: jest.Mocked<OrderInterface>;
  let mockPool: Database;

  beforeEach(() => {
    jest.clearAllMocks();

    orderRepository = {
      create: jest.fn(),
      createItems: jest.fn(),
      findUserById: jest.fn(),
      findByUserId: jest.fn(),
      findById: jest.fn(),
    };

    mockPool = {
      connect: jest
        .fn<() => Promise<PoolClient>>()
        .mockResolvedValue(mockClient as unknown as PoolClient),
    };

    orderService = new OrderService(orderRepository, mockPool);
  });

  it("should create an order", async () => {
    const data: CreateOrderData = {
      userId: "user-1",
      items: [
        {
          productVariantId: 1,
          quantity: 2,
        },
      ],
    };

    const order: Order = {
      id: "order-1",
      userId: "user-1",
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    orderRepository.findUserById.mockResolvedValue(true);
    orderRepository.create.mockResolvedValue(order);
    orderRepository.createItems.mockResolvedValue();

    const result = await orderService.createOrder(data);

    expect(result).toEqual(order);

    expect(orderRepository.findUserById).toHaveBeenCalledWith(
      mockClient as unknown as PoolClient,
      "user-1",
    );

    expect(orderRepository.create).toHaveBeenCalledWith(
      mockClient as unknown as PoolClient,
      data,
    );

    expect(orderRepository.createItems).toHaveBeenCalledWith(
      mockClient as unknown as PoolClient,
      "order-1",
      data.items,
    );

    expect(mockClient.query).toHaveBeenNthCalledWith(1, "BEGIN");
    expect(mockClient.query).toHaveBeenNthCalledWith(2, "COMMIT");
    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });

  it("should rollback transaction when user does not exist", async () => {
    const data: CreateOrderData = {
      userId: "user-1",
      items: [
        {
          productVariantId: 1,
          quantity: 2,
        },
      ],
    };

    orderRepository.findUserById.mockResolvedValue(false);

    await expect(orderService.createOrder(data)).rejects.toThrow();

    expect(orderRepository.create).not.toHaveBeenCalled();
    expect(orderRepository.createItems).not.toHaveBeenCalled();

    expect(mockClient.query).toHaveBeenNthCalledWith(1, "BEGIN");
    expect(mockClient.query).toHaveBeenNthCalledWith(2, "ROLLBACK");
    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });

  it("should rollback transaction when order creation fails", async () => {
    const data: CreateOrderData = {
      userId: "user-1",
      items: [],
    };

    orderRepository.findUserById.mockResolvedValue(true);
    orderRepository.create.mockRejectedValue(new Error("DB error"));

    await expect(orderService.createOrder(data)).rejects.toThrow("DB error");

    expect(orderRepository.createItems).not.toHaveBeenCalled();

    expect(mockClient.query).toHaveBeenNthCalledWith(1, "BEGIN");
    expect(mockClient.query).toHaveBeenNthCalledWith(2, "ROLLBACK");
    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });

  it("should rollback transaction when order items creation fails", async () => {
    const data: CreateOrderData = {
      userId: "user-1",
      items: [
        {
          productVariantId: 1,
          quantity: 2,
        },
      ],
    };

    const order: Order = {
      id: "order-1",
      userId: "user-1",
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    orderRepository.findUserById.mockResolvedValue(true);
    orderRepository.create.mockResolvedValue(order);
    orderRepository.createItems.mockRejectedValue(new Error("Items DB error"));

    await expect(orderService.createOrder(data)).rejects.toThrow(
      "Items DB error",
    );

    expect(mockClient.query).toHaveBeenNthCalledWith(1, "BEGIN");
    expect(mockClient.query).toHaveBeenNthCalledWith(2, "ROLLBACK");
    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });

  it("should return orders for a user", async () => {
    const orders: OrderDetails[] = [
      {
        id: "order-1",
        userId: "user-1",
        status: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        items: [],
      },
    ];

    orderRepository.findByUserId.mockResolvedValue(orders);

    const result = await orderService.getOrdersByUserId("user-1");

    expect(result).toEqual(orders);

    expect(orderRepository.findByUserId).toHaveBeenCalledWith(
      mockClient as unknown as PoolClient,
      "user-1",
    );

    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });

  it("should return an order by id", async () => {
    const order: OrderDetails = {
      id: "order-1",
      userId: "user-1",
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: [],
    };

    orderRepository.findById.mockResolvedValue(order);

    const result = await orderService.getOrderById("order-1", "user-1");

    expect(result).toEqual(order);

    expect(orderRepository.findById).toHaveBeenCalledWith(
      mockClient as unknown as PoolClient,
      "order-1",
      "user-1",
    );

    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });

  it("should return null when order does not exist", async () => {
    orderRepository.findById.mockResolvedValue(null);

    const result = await orderService.getOrderById("order-999", "user-1");

    expect(result).toBeNull();

    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });

  it("should release client when getOrdersByUserId fails", async () => {
    orderRepository.findByUserId.mockRejectedValue(new Error("DB error"));

    await expect(orderService.getOrdersByUserId("user-1")).rejects.toThrow(
      "DB error",
    );

    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });

  it("should release client when getOrderById fails", async () => {
    orderRepository.findById.mockRejectedValue(new Error("DB error"));

    await expect(
      orderService.getOrderById("order-1", "user-1"),
    ).rejects.toThrow("DB error");

    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });
});
