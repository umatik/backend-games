import { Router } from "express";
import type { OrderController } from "../controllers/order.controller.js";
import { authenticationMiddleware } from "../middleware/authentication.middleware.js";

export const createOrderRouter = (orderController: OrderController) => {
  const router = Router();

  router.get("/", authenticationMiddleware, orderController.getOrders);
  router.get("/:id", authenticationMiddleware, orderController.getOrder);
  router.post("/", authenticationMiddleware, orderController.createOrder);

  return router;
};
