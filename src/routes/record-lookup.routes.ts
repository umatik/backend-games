import { Router } from "express";
import type { Multer } from "multer";
import {
  MAX_LABEL_IMAGES,
  type RecordLookupController,
} from "@/controllers/record-lookup.controller.js";
import { authenticationMiddleware } from "@/middleware/authentication.middleware.js";
import { requirePermission } from "@/middleware/permission.middleware.js";
import type { AuthorizationService } from "@/services/authorization.service.js";

/** Pomocnicze endpointy kreatora. Niczego nie zapisują, tylko podpowiadają dane. Montowane pod `/products`. */
export const createRecordLookupRouter = (
  controller: RecordLookupController,
  authorizationService: AuthorizationService,
  upload: Multer,
) => {
  const router = Router();

  const canCreate = [
    authenticationMiddleware,
    requirePermission(authorizationService, "products:create"),
  ];

  /**
   * @openapi
   * /products/lookup/photo:
   *   post:
   *     tags: [Products – wizard]
   *     summary: Read a label photo with Claude and find matching releases on Discogs
   *     description: >-
   *       Returns what was read from the label (`reading`, used for "none of these, enter manually"), up to 10
   *       Discogs `candidates` (search order: catalog number + label, catalog number, artist + title) and
   *       `photoUploadIds`: the photos are kept for 24 hours; pass them as `photoUploadIds` when creating the
   *       variant and the first one becomes its primary photo. Discogs images are not used.
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             required: [images]
   *             properties:
   *               images:
   *                 type: array
   *                 maxItems: 2
   *                 description: 1–2 label photos (JPEG, PNG or WebP, max 5 MB each)
   *                 items:
   *                   type: string
   *                   format: binary
   *     responses:
   *       200:
   *         description: Label read; candidates may be empty
   *       400:
   *         description: Missing, too many, too large or unsupported photos
   *       502:
   *         description: >-
   *           Claude or Discogs failed. The photos are still kept: `photoUploadIds` is returned so the wizard can
   *           continue with manual entry and attach the photo.
   *       503:
   *         description: Claude or Discogs is not configured; `photoUploadIds` is returned as for 502
   */
  router.post(
    "/lookup/photo",
    ...canCreate,
    upload.array("images", MAX_LABEL_IMAGES),
    controller.lookupByPhoto,
  );

  /**
   * @openapi
   * /products/lookup:
   *   get:
   *     tags: [Products – wizard]
   *     summary: Find releases on Discogs by catalog number (no photo)
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: catalogNumber
   *         required: true
   *         schema: { type: string }
   *       - in: query
   *         name: label
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Candidates (may be empty)
   *       400:
   *         description: Missing catalog number
   *       503:
   *         description: Discogs is not configured
   */
  router.get("/lookup", ...canCreate, controller.lookupByCatalogNumber);

  /**
   * @openapi
   * /products/lookup/releases/{releaseId}:
   *   get:
   *     tags: [Products – wizard]
   *     summary: Discogs release mapped to the product form (title, artists, tracklist, preview links, pressing)
   *     description: Condition, price and quantity are not included; the admin fills them in.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: releaseId
   *         required: true
   *         schema: { type: integer }
   *     responses:
   *       200:
   *         description: Form draft
   *       404:
   *         description: Release not found on Discogs
   *       503:
   *         description: Discogs is not configured
   */
  router.get("/lookup/releases/:releaseId", ...canCreate, controller.getReleaseDraft);

  /**
   * @openapi
   * /products/lookup/condition-note:
   *   post:
   *     tags: [Products – wizard]
   *     summary: Translate a Polish condition note into English and Spanish with Claude
   *     description: Saves nothing; the admin confirms or edits the translation before saving the variant.
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [text]
   *             properties:
   *               text:
   *                 type: string
   *                 maxLength: 1000
   *           example:
   *             text: Lekki trzask na stronie B, okładka z przetarciem
   *     responses:
   *       200:
   *         description: "`conditionNote` as { en, es, pl }"
   *       503:
   *         description: Claude is not configured
   */
  router.post("/lookup/condition-note", ...canCreate, controller.translateConditionNote);

  return router;
};
