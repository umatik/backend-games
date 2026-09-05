import type { Response } from "express";
import { ProductNotFoundError } from "../errors/product-not-found.error.js";
import { UserNotFoundError } from "../errors/user-not-found.error.js";
import { InsufficientStockError } from "../errors/insufficient-stock.error.js";
import type { CreateOrderData } from "../types/order.types.js";
import { OrderService } from "../services/order.service.js";
import { isValidOrderItems } from "../validators/order.validator.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";

export class OrderController {
  constructor(private orderService: OrderService) {}

  createOrder = async (req: AuthenticatedRequest, res: Response) => {
    const { items } = req.body;

    if (!isValidOrderItems(items)) {
      res.status(400).json({
        message: "Invalid order items",
      });
      return;
    }

    if (!req.user) {
      res.status(401).json({
        message: "Unauthorized",
      });
      return;
    }

    const data: CreateOrderData = {
      userId: req.user.userId,
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

      if (error instanceof ProductNotFoundError) {
        res.status(404).json({
          message: error.message,
        });
        return;
      }

      if (error instanceof InsufficientStockError) {
        res.status(409).json({
          message: error.message,
        });
        return;
      }

      throw error;
    }
  };
}
