import { Router } from "express";
import type { OrderController } from "../controllers/order.controller.js";
import { authenticationMiddleware } from "../middleware/authentication.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

export const createOrderRouter = (orderController: OrderController) => {
  const router = Router();

  router.get(
    "/",
    authenticationMiddleware,
    requirePermission("orders:read"),
    orderController.getOrders,
  );
  router.get(
    "/:id",
    authenticationMiddleware,
    requirePermission("orders:read"),
    orderController.getOrder,
  );
  router.post(
    "/",
    authenticationMiddleware,
    requirePermission("orders:create"),
    orderController.createOrder,
  );

  return router;
};
