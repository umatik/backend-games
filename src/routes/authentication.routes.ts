import { Router } from "express";
import type { AuthenticationController } from "@/controllers/authentication.controller.js";
import rateLimit from "express-rate-limit";

export const createAuthRouter = (authController: AuthenticationController) => {
  const router = Router();

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === "test",
    handler: (req, res) => {
      res.status(429).json({
        message: "Too many login attempts. Please try again later.",
      });
    },
  });

  /**
   * @openapi
   * /login:
   *   post:
   *     tags:
   *       - Authentication
   *     summary: Login
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *               - password
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *               password:
   *                 type: string
   *                 format: password
   *     responses:
   *       200:
   *         description: Login successful
   *       400:
   *         description: Invalid request
   *       401:
   *         description: Invalid credentials
   *       429:
   *         description: Too many login attempts
   */
  router.post("/login", loginLimiter, authController.login);

  return router;
};
