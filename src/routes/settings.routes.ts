import { Router } from "express";
import type { SettingsController } from "@/controllers/settings.controller.js";
import { authenticationMiddleware } from "@/middleware/authentication.middleware.js";
import { requirePermission } from "@/middleware/permission.middleware.js";
import type { AuthorizationService } from "@/services/authorization.service.js";

export const createSettingsRouter = (
  controller: SettingsController,
  authorizationService: AuthorizationService,
) => {
  const router = Router();

  router.use(
    authenticationMiddleware,
    requirePermission(authorizationService, "settings:manage"),
  );

  /**
   * @openapi
   * /settings:
   *   get:
   *     tags: [Settings]
   *     summary: List all shop settings
   *     description: >-
   *       Value source order: database (set in the admin panel) → environment variable → default.
   *       Secrets (API keys) are never returned, only `maskedValue` such as `sk-ant…a1b2`.
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Settings with `key`, `group`, `kind` (secret/text/number/select), `options`, `isSet`,
   *           `source`, `value` or `maskedValue`, `updatedAt` and `updatedBy`
   *       403:
   *         description: Missing settings:manage permission
   */
  router.get("/", controller.getSettings);

  /**
   * @openapi
   * /settings:
   *   patch:
   *     tags: [Settings]
   *     summary: Change settings (all or nothing)
   *     description: >-
   *       `null` removes the stored value, so the setting falls back to the environment variable or default.
   *       Secrets are stored encrypted with SETTINGS_ENCRYPTION_KEY; changes apply without a restart.
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [values]
   *             properties:
   *               values:
   *                 type: object
   *                 additionalProperties: true
   *           example:
   *             values:
   *               anthropic.apiKey: sk-ant-...
   *               anthropic.model: claude-haiku-5-5
   *               shop.contactEmail: null
   *     responses:
   *       200:
   *         description: Updated settings
   *       400:
   *         description: Unknown setting or invalid value, `errors` lists them
   *       503:
   *         description: SETTINGS_ENCRYPTION_KEY is not configured, secrets cannot be saved
   */
  router.patch("/", controller.updateSettings);

  /**
   * @openapi
   * /settings/test/{integration}:
   *   post:
   *     tags: [Settings]
   *     summary: Check that the saved key works
   *     description: Claude is checked without generating text (no cost); Discogs with one small search.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: integration
   *         required: true
   *         schema:
   *           type: string
   *           enum: [anthropic, discogs]
   *     responses:
   *       200:
   *         description: "`ok` true or false with a `message`"
   *       404:
   *         description: Unknown integration
   */
  router.post("/test/:integration", controller.testConnection);

  return router;
};
