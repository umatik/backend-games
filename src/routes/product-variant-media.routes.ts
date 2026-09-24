import { Router } from "express";

import type { ProductVariantMediaController } from "@/controllers/product-variant-media.controller.js";
import type { Multer } from "multer";

export const createProductVariantMediaRoutes = (
  controller: ProductVariantMediaController,
  upload: Multer,
): Router => {
  const router = Router();

  router.get(
    "/variants/:productVariantId/media",
    controller.findByProductVariantId.bind(controller),
  );

  router.get("/media/:mediaId", controller.findById.bind(controller));

  router.post(
    "/variants/:productVariantId/media",
    upload.single("file"),
    controller.create.bind(controller),
  );

  router.patch("/media/:mediaId", controller.update.bind(controller));

  router.delete("/media/:mediaId", controller.delete.bind(controller));

  return router;
};
