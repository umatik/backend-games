import { Router } from "express";
import type { ProductController } from "@/controllers/product.controller.js";
import { authenticationMiddleware } from "@/middleware/authentication.middleware.js";
import { requirePermission } from "@/middleware/permission.middleware.js";
import type { AuthorizationService } from "@/services/authorization.service.js";

export const createProductRouter = (
  productController: ProductController,
  authorizationService: AuthorizationService,
) => {
  const router = Router();

  const can = (permission: string) => [
    authenticationMiddleware,
    requirePermission(authorizationService, permission),
  ];

  /**
   * @openapi
   * components:
   *   parameters:
   *     ProductId:
   *       in: path
   *       name: id
   *       required: true
   *       schema:
   *         type: integer
   *     VariantId:
   *       in: path
   *       name: variantId
   *       required: true
   *       schema:
   *         type: integer
   *     Page:
   *       in: query
   *       name: page
   *       schema:
   *         type: integer
   *         default: 1
   *     Limit:
   *       in: query
   *       name: limit
   *       schema:
   *         type: integer
   *         default: 20
   *         maximum: 100
   *     ProductFilters:
   *       in: query
   *       name: filters
   *       style: form
   *       explode: true
   *       description: >-
   *         Filtry (każdy opcjonalny): type, artist, format, mediaCondition, label, priceMinEur, priceMaxEur
   *         (eurocenty), available (true/false), q (tytuł, artyści, wytwórnia, nr katalogowy),
   *         sort (newest, price_asc, price_desc, artist; domyślnie newest). Warunki wariantu dotyczą tego
   *         samego wariantu.
   *       schema:
   *         type: object
   *         properties:
   *           type: { type: string }
   *           artist: { type: string }
   *           format: { type: string, enum: [LP, '12"', '10"', '7"'] }
   *           mediaCondition: { type: string, enum: [M, NM, VG+, VG, G+, G, F, P] }
   *           label: { type: string }
   *           priceMinEur: { type: integer }
   *           priceMaxEur: { type: integer }
   *           available: { type: boolean }
   *           q: { type: string }
   *           sort: { type: string, enum: [newest, price_asc, price_desc, artist] }
   *   schemas:
   *     ProductVariantInput:
   *       type: object
   *       additionalProperties: false
   *       properties:
   *         priceEur:
   *           type: integer
   *           minimum: 0
   *           description: Price in euro cents (1500 = 15.00 EUR)
   *         quantity:
   *           type: integer
   *           minimum: 0
   *           default: 1
   *         photoUploadIds:
   *           type: array
   *           maxItems: 2
   *           description: >-
   *             Photo ids from POST /products/lookup/photo (create only). The first becomes the primary photo.
   *           items:
   *             type: string
   *             format: uuid
   *         attributes:
   *           type: object
   *           description: >-
   *             Type-specific fields, see GET /products/types. vinyl: format (LP, 12", 10", 7"),
   *             mediaCondition and sleeveCondition (Goldmine; sleeve also generic/no_cover), optional speed,
   *             year, label, catalogNumber, country, pressing, conditionNote {en, es, pl}, discogsReleaseId.
   *             tshirt: color, size. other: optional details.
   *     ProductVariant:
   *       type: object
   *       properties:
   *         id: { type: integer }
   *         productId: { type: integer }
   *         priceEur: { type: integer, description: Euro cents }
   *         pricePln:
   *           type: integer
   *           nullable: true
   *           description: Grosze, NBP rate, rounded up to full złoty; null when no rate is available
   *         quantity: { type: integer }
   *         attributes: { type: object }
   *         media: { type: array, items: { type: object } }
   *     Product:
   *       type: object
   *       properties:
   *         id: { type: integer }
   *         type: { type: string }
   *         title: { type: string }
   *         slug: { type: string }
   *         description: { type: string, nullable: true }
   *         isPublished: { type: boolean }
   *         attributes: { type: object }
   *         variants:
   *           type: array
   *           items:
   *             $ref: '#/components/schemas/ProductVariant'
   *     Warnings:
   *       type: array
   *       description: Non-blocking hints for the wizard summary, e.g. missing_preview
   *       items:
   *         type: string
   */

  /**
   * @openapi
   * /products:
   *   get:
   *     tags: [Products]
   *     summary: List published products
   *     parameters:
   *       - $ref: '#/components/parameters/Page'
   *       - $ref: '#/components/parameters/Limit'
   *       - $ref: '#/components/parameters/ProductFilters'
   *     responses:
   *       200:
   *         description: List of published products
   *       400:
   *         description: Invalid pagination or filter parameters
   */
  router.get("/", productController.getProducts);

  /**
   * @openapi
   * /products/types:
   *   get:
   *     tags: [Products]
   *     summary: Product types with JSON Schemas of their attributes (for building forms)
   *     responses:
   *       200:
   *         description: Product types
   */
  router.get("/types", productController.getProductTypes);

  /**
   * @openapi
   * /products/manage:
   *   get:
   *     tags: [Products – admin]
   *     summary: List products including drafts
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [all, published, draft]
   *           default: all
   *       - $ref: '#/components/parameters/Page'
   *       - $ref: '#/components/parameters/Limit'
   *       - $ref: '#/components/parameters/ProductFilters'
   *     responses:
   *       200:
   *         description: List of products
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.get("/manage", ...can("products:update"), productController.getManagedProducts);

  /**
   * @openapi
   * /products/manage/{id}:
   *   get:
   *     tags: [Products – admin]
   *     summary: Get any product (also a draft) with warnings
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - $ref: '#/components/parameters/ProductId'
   *     responses:
   *       200:
   *         description: Product found
   *       404:
   *         description: Product not found
   */
  router.get("/manage/:id", ...can("products:update"), productController.getManagedProduct);

  /**
   * @openapi
   * /products/{id}:
   *   get:
   *     tags: [Products]
   *     summary: Get a published product
   *     parameters:
   *       - $ref: '#/components/parameters/ProductId'
   *     responses:
   *       200:
   *         description: Product found
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 product:
   *                   $ref: '#/components/schemas/Product'
   *       404:
   *         description: Product not found or not published
   */
  router.get("/:id", productController.getProduct);

  /**
   * @openapi
   * /products:
   *   post:
   *     tags: [Products – admin]
   *     summary: Create a product (as a draft)
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [type, title]
   *             additionalProperties: false
   *             properties:
   *               type:
   *                 type: string
   *                 enum: [vinyl, tshirt, other]
   *                 description: Product type key, see GET /products/types
   *               title:
   *                 type: string
   *                 maxLength: 255
   *               description:
   *                 type: string
   *                 nullable: true
   *               attributes:
   *                 type: object
   *                 description: Type-specific fields, e.g. vinyl requires `artists` (string[])
   *               variants:
   *                 type: array
   *                 items:
   *                   $ref: '#/components/schemas/ProductVariantInput'
   *           example:
   *             type: vinyl
   *             title: Jah Prophecy
   *             attributes:
   *               artists: [Bunnington Judah, Zulu Vibes]
   *             variants:
   *               - priceEur: 1500
   *                 quantity: 1
   *                 attributes:
   *                   format: '7"'
   *                   speed: 45
   *                   label: Zulu Vibes
   *                   catalogNumber: ZV-7-006
   *                   mediaCondition: NM
   *                   sleeveCondition: generic
   *     responses:
   *       201:
   *         description: Product created (draft), with warnings
   *       400:
   *         description: Invalid request, `errors` lists invalid fields
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.post("/", ...can("products:create"), productController.createProduct);

  /**
   * @openapi
   * /products/{id}:
   *   patch:
   *     tags: [Products – admin]
   *     summary: Update product fields (variants have their own endpoints)
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - $ref: '#/components/parameters/ProductId'
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             additionalProperties: false
   *             minProperties: 1
   *             properties:
   *               title:
   *                 type: string
   *               description:
   *                 type: string
   *                 nullable: true
   *               attributes:
   *                 type: object
   *                 description: Replaces all type-specific fields; validated against the product type
   *     responses:
   *       200:
   *         description: Product updated
   *       400:
   *         description: Invalid request
   *       404:
   *         description: Product not found
   */
  router.patch("/:id", ...can("products:update"), productController.updateProduct);

  /**
   * @openapi
   * /products/{id}/publish:
   *   post:
   *     tags: [Products – admin]
   *     summary: Publish a product (needs at least one variant)
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - $ref: '#/components/parameters/ProductId'
   *     responses:
   *       200:
   *         description: Product published; `warnings` lists non-blocking hints such as missing_preview
   *       400:
   *         description: Product has no variants
   *       404:
   *         description: Product not found
   */
  router.post("/:id/publish", ...can("products:publish"), productController.publishProduct);

  /**
   * @openapi
   * /products/{id}/unpublish:
   *   post:
   *     tags: [Products – admin]
   *     summary: Hide a product from the shop
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - $ref: '#/components/parameters/ProductId'
   *     responses:
   *       200:
   *         description: Product unpublished
   *       404:
   *         description: Product not found
   */
  router.post(
    "/:id/unpublish",
    ...can("products:publish"),
    productController.unpublishProduct,
  );

  /**
   * @openapi
   * /products/{id}:
   *   delete:
   *     tags: [Products – admin]
   *     summary: Delete a product
   *     description: >-
   *       A draft that was never ordered is deleted permanently together with its media files.
   *       Published products (or products with orders) are soft deleted.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - $ref: '#/components/parameters/ProductId'
   *     responses:
   *       204:
   *         description: Product deleted
   *       404:
   *         description: Product not found
   */
  router.delete("/:id", ...can("products:delete"), productController.deleteProduct);

  /**
   * @openapi
   * /products/{id}/variants:
   *   post:
   *     tags: [Products – admin]
   *     summary: Add a variant to a product
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - $ref: '#/components/parameters/ProductId'
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             allOf:
   *               - $ref: '#/components/schemas/ProductVariantInput'
   *               - required: [priceEur]
   *     responses:
   *       201:
   *         description: Variant created
   *       400:
   *         description: Invalid request
   *       404:
   *         description: Product not found
   */
  router.post("/:id/variants", ...can("products:update"), productController.createVariant);

  /**
   * @openapi
   * /products/{id}/variants/{variantId}:
   *   patch:
   *     tags: [Products – admin]
   *     summary: Update a variant
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - $ref: '#/components/parameters/ProductId'
   *       - $ref: '#/components/parameters/VariantId'
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             allOf:
   *               - $ref: '#/components/schemas/ProductVariantInput'
   *               - minProperties: 1
   *     responses:
   *       200:
   *         description: Variant updated
   *       400:
   *         description: Invalid request
   *       404:
   *         description: Variant not found in this product
   */
  router.patch(
    "/:id/variants/:variantId",
    ...can("products:update"),
    productController.updateVariant,
  );

  /**
   * @openapi
   * /products/{productId}/variants/{variantId}:
   *   delete:
   *     tags: [Products – admin]
   *     summary: Delete a variant
   *     description: >-
   *       A variant of a draft that was never ordered is deleted permanently together with its media files;
   *       otherwise it is soft deleted. The last variant of a published product cannot be deleted (409):
   *       unpublish or delete the whole product instead.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: productId
   *         required: true
   *         schema:
   *           type: integer
   *       - $ref: '#/components/parameters/VariantId'
   *     responses:
   *       200:
   *         description: Variant deleted
   *       404:
   *         description: Variant not found
   *       409:
   *         description: The last variant of a published product
   */
  router.delete(
    "/:productId/variants/:variantId",
    ...can("products:delete"),
    productController.deleteProductVariant,
  );

  return router;
};
