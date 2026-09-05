import { Router } from "express";
import type { AuthController } from "../controllers/auth.controller.js";

export const createAuthRouter = (authController: AuthController) => {
  const router = Router();

  router.post("/login", authController.login);

  return router;
};
