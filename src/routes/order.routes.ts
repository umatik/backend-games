import { Router } from "express";
import type { OrderController } from "../controllers/order.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

export const createOrderRouter = (orderController: OrderController) => {
  const router = Router();

  router.post("/", authMiddleware, orderController.createOrder);

  return router;
};
