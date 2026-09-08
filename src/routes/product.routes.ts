import { Router } from "express";
import type { ProductController } from "../controllers/product.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

export const createProductRouter = (productController: ProductController) => {
  const router = Router();

  router.get("/", productController.getProducts);
  router.get("/:id", productController.getProduct);

  router.post("/", authMiddleware, productController.createProduct);
  router.patch("/:id", authMiddleware, productController.updateProduct);
  router.delete("/:id", authMiddleware, productController.deleteProduct);
  router.delete(
    "/:productId/variants/:variantId",
    authMiddleware,
    productController.deleteProductVariant,
  );

  return router;
};
