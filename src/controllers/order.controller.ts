import type { Response } from "express";
import { ProductNotFoundError } from "../errors/product-not-found.error.js";
import { UserNotFoundError } from "../errors/user-not-found.error.js";
import { InsufficientStockError } from "../errors/insufficient-stock.error.js";
import type { CreateOrderData } from "../types/order.types.js";
import { OrderService } from "../services/order.service.js";
import { isValidOrderItems } from "../validators/order.validator.js";
import type { AuthenticatedRequest } from "../middleware/authentication.middleware.js";
import { parseId } from "../validators/helpers/id.validator.js";
import { createPagination } from "../utils/pagination.js";
import { isValidPagination } from "../validators/helpers/pagination.validator.js";
import type { AuthorizationService } from "../services/authorization.service.js";

export class OrderController {
  constructor(
    private orderService: OrderService,
    private authorizationService: AuthorizationService,
  ) {}

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
      userId: Number(req.user.userId),
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

  getOrders = async (req: AuthenticatedRequest, res: Response) => {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);

    if (!isValidPagination(page, limit)) {
      res.status(400).json({
        message: "Invalid pagination parameters",
      });
      return;
    }

    const { orders, total } = await this.orderService.getOrders(page, limit);

    res.status(200).json({
      message: "Orders found",
      orders,
      pagination: createPagination(page, limit, total),
    });
  };

  getMyOrders = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({
        message: "Unauthorized",
      });
      return;
    }

    const userId = Number(req.user.userId);

    const orders = await this.orderService.getOrdersByUserId(userId);

    res.status(200).json(orders);
  };

  getOrder = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({
        message: "Unauthorized",
      });
      return;
    }

    const id = parseId(req.params.id);

    if (id === null) {
      res.status(400).json({
        message: "Invalid order id",
      });
      return;
    }

    const order = await this.orderService.getOrderById(
      id,
      Number(req.user.userId),
    );

    if (!order) {
      res.status(404).json({
        message: "Order not found",
      });
      return;
    }

    res.status(200).json({
      message: "Order found",
      order,
    });
  };

  deleteOrder = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({
        message: "Unauthorized",
      });
      return;
    }

    const id = parseId(req.params.id);

    if (id === null) {
      res.status(400).json({
        message: "Invalid order id",
      });
      return;
    }

    const isAdmin = await this.authorizationService.hasRole(
      Number(req.user.userId),
      "admin",
    );

    const deleted = await this.orderService.deleteOrder(
      id,
      Number(req.user.userId),
      isAdmin,
    );

    if (!deleted) {
      res.status(404).json({
        message: "Order not found",
      });
      return;
    }

    res.status(204).send();
  };
}
