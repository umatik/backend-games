import { Router } from "express";
import type { OrderController } from "../controllers/order.controller.js";

export const createOrderRouter = (orderController: OrderController) => {
  const router = Router();

  router.post("/", orderController.createOrder);

  return router;
};
