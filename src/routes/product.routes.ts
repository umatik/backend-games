import { Router } from "express";
import type { ProductController } from "../controllers/product.controller.js";

export const createProductRouter = (productController: ProductController) => {
  const router = Router();

  router.get("/", productController.getProducts);
  router.post("/", productController.createProduct);
  router.get("/:id", productController.getProduct);
  router.patch("/:id", productController.updateProduct);
  router.delete("/:id", productController.deleteProduct);

  return router;
};
