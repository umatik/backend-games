import { Router } from "express";
import type { AuthenticationController } from "../controllers/authentication.controller.js";

export const createAuthRouter = (authController: AuthenticationController) => {
  const router = Router();

  router.post("/login", authController.login);

  return router;
};
