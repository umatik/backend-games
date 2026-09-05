import type { Request, Response } from "express";
import { ProductNotFoundError } from "../errors/product-not-found.error.js";
import type { CreateOrderData } from "../types/order.types.js";
import { OrderService } from "../services/order.service.js";
import {
  isValidOrderUserId,
  isValidOrderItems,
} from "../validators/order.validator.js";
import { UserNotFoundError } from "../errors/user-not-found.error.js";
import { InsufficientStockError } from "../errors/insufficient-stock.error.js";

export class OrderController {
  constructor(private orderService: OrderService) {}

  createOrder = async (req: Request, res: Response) => {
    const { userId, items } = req.body;

    if (!isValidOrderUserId(userId) || !isValidOrderItems(items)) {
      res.status(400).json({
        message: "Invalid order data",
      });

      return;
    }

    const data: CreateOrderData = {
      userId,
      items,
    };

    try {
      const order = await this.orderService.createOrder(data);

      res.status(201).json({
        message: "Order created",
        order,
      });
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        res.status(404).json({
          message: error.message,
        });

        return;
      }

      if (error instanceof InsufficientStockError) {
        res.status(409).json({ message: error.message });
        return;
      }

      if (error instanceof ProductNotFoundError) {
        res.status(404).json({
          message: error.message,
        });
        return;
      }

      throw error;
    }
  };
}
