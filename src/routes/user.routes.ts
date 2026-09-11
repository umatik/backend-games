import { Router } from "express";
import type { UserController } from "../controllers/user.controller.js";
import { authenticationMiddleware } from "../middleware/authentication.middleware.js";

export const createUserRouter = (userController: UserController) => {
  const router = Router();

  router.post("/register", userController.register);
  router.get("/:id", authenticationMiddleware, userController.getUser);
  router.patch("/:id", authenticationMiddleware, userController.updateUser);

  return router;
};
