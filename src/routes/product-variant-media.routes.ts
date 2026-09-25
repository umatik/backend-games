import { Router } from "express";

import type { ProductVariantMediaController } from "@/controllers/product-variant-media.controller.js";
import type { Multer } from "multer";
import { authenticationMiddleware } from "@/middleware/authentication.middleware.js";
import { requirePermission } from "@/middleware/permission.middleware.js";
import { authorizationService } from "@/dependency-injection.js";

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
    authenticationMiddleware,
    requirePermission(authorizationService, "products:create"),
    upload.single("file"),
    controller.create.bind(controller),
  );

  router.patch(
    "/media/:mediaId",
    authenticationMiddleware,
    requirePermission(authorizationService, "products:update"),
    controller.update.bind(controller),
  );

  router.delete(
    "/media/:mediaId",
    authenticationMiddleware,
    requirePermission(authorizationService, "products:delete"),
    controller.delete.bind(controller),
  );

  return router;
};
