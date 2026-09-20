import {Router} from "express";
import type {OrderController} from "../controllers/order.controller.js";
import {authenticationMiddleware} from "../middleware/authentication.middleware.js";
import {requirePermission} from "../middleware/permission.middleware.js";
import type {AuthorizationService} from "../services/authorization.service.js";

export const createOrderRouter = (orderController: OrderController, authorizationService: AuthorizationService,) => {
  const router = Router();

  /**
   * @openapi
   * /orders:
   *   get:
   *     tags:
   *       - Orders
   *     summary: Get all orders
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: List of orders
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.get(
    "/",
    authenticationMiddleware,
    requirePermission(authorizationService, "orders:read"),
    orderController.getOrders,
  );

  /**
   * @openapi
   * /orders/{id}:
   *   get:
   *     tags:
   *       - Orders
   *     summary: Get order by ID
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Order found
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   *       404:
   *         description: Order not found
   */
  router.get(
    "/:id",
    authenticationMiddleware,
    requirePermission(authorizationService, "orders:read"),
    orderController.getOrder,
  );

  /**
   * @openapi
   * /orders:
   *   post:
   *     tags:
   *       - Orders
   *     summary: Create an order
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               items:
   *                 type: array
   *                 items:
   *                   type: object
   *     responses:
   *       201:
   *         description: Order created
   *       400:
   *         description: Invalid request
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.post(
    "/",
    authenticationMiddleware,
    requirePermission(authorizationService, "orders:create"),
    orderController.createOrder,
  );

  return router;
};
