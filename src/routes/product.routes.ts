import {Router} from "express";
import type {ProductController} from "../controllers/product.controller.js";
import {authenticationMiddleware} from "../middleware/authentication.middleware.js";
import {requirePermission} from "../middleware/permission.middleware.js";
import type {AuthorizationService} from "../services/authorization.service.js";

export const createProductRouter = (
  productController: ProductController,
  authorizationService: AuthorizationService,
) => {
  const router = Router();

  /**
   * @openapi
   * /products:
   *   get:
   *     tags:
   *       - Products
   *     summary: Get all products
   *     responses:
   *       200:
   *         description: List of products
   */
  router.get("/", productController.getProducts);

  /**
   * @openapi
   * /products/{id}:
   *   get:
   *     tags:
   *       - Products
   *     summary: Get product by ID
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Product found
   *       404:
   *         description: Product not found
   */
  router.get("/:id", productController.getProduct);

  /**
   * @openapi
   * /products:
   *   post:
   *     tags:
   *       - Products
   *     summary: Create a product
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - name
   *             properties:
   *               name:
   *                 type: string
   *     responses:
   *       201:
   *         description: Product created
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
    requirePermission(authorizationService, "products:create"),
    productController.createProduct,
  );

  /**
   * @openapi
   * /products/{id}:
   *   patch:
   *     tags:
   *       - Products
   *     summary: Update a product
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *               description:
   *                 type: string
   *     responses:
   *       200:
   *         description: Product updated
   *       400:
   *         description: Invalid request
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   *       404:
   *         description: Product not found
   */
  router.patch(
    "/:id",
    authenticationMiddleware,
    requirePermission(authorizationService, "products:update"),
    productController.updateProduct,
  );

  /**
   * @openapi
   * /products/{id}:
   *   delete:
   *     tags:
   *       - Products
   *     summary: Delete a product
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       204:
   *         description: Product deleted
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   *       404:
   *         description: Product not found
   */
  router.delete(
    "/:id",
    authenticationMiddleware,
    requirePermission(authorizationService, "products:delete"),
    productController.deleteProduct,
  );

  /**
   * @openapi
   * /products/{productId}/variants/{variantId}:
   *   delete:
   *     tags:
   *       - Products
   *     summary: Delete a product variant
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path_
   *         name: productId
   *         required: true
   *         schema:
   *           type: integer
   *       - in: path
   *         name: variantId
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       204:
   *         description: Product variant deleted
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   *       404:
   *         description: Product variant not found
   */
  router.delete(
    "/:productId/variants/:variantId",
    authenticationMiddleware,
    requirePermission(authorizationService, "products:delete"),
    productController.deleteProductVariant,
  );

  return router;
};