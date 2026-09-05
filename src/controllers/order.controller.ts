import type { Request, Response } from "express";
import { ProductNotFoundError } from "../errors/product-not-found.error.js";
import type { CreateOrderData } from "../types/order.types.js";
import { OrderService } from "../services/order.service.js";

export class OrderController {
  constructor(private orderService: OrderService) {}

  createOrder = async (req: Request, res: Response) => {
    const data: CreateOrderData = req.body;

    try {
      const order = await this.orderService.createOrder(data);

      res.status(201).json({
        message: "Order created",
        order,
      });
    } catch (error) {
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
