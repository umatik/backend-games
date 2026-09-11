import { Router } from "express";
import type { ProductController } from "../controllers/product.controller.js";
import { authenticationMiddleware } from "../middleware/authentication.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

export const createProductRouter = (productController: ProductController) => {
  const router = Router();

  router.get("/", productController.getProducts);
  router.get("/:id", productController.getProduct);

  router.post("/", authenticationMiddleware, productController.createProduct);

  router.patch(
    "/:id",
    authenticationMiddleware,
    productController.updateProduct,
  );

  router.delete(
    "/:id",
    authenticationMiddleware,
    requirePermission("products:delete"),
    productController.deleteProduct,
  );

  router.delete(
    "/:productId/variants/:variantId",
    authenticationMiddleware,
    productController.deleteProductVariant,
  );

  return router;
};
