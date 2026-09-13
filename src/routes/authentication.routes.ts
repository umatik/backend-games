import { Router } from "express";
import type { AuthenticationController } from "../controllers/authentication.controller.js";
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

  router.post("/login", loginLimiter, authController.login);

  return router;
};
