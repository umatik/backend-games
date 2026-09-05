import { Router } from "express";
import type { UserController } from "../controllers/user.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

export const createUserRouter = (userController: UserController) => {
  const router = Router();

  router.get("/:id", authMiddleware, userController.getUser);

  return router;
};
