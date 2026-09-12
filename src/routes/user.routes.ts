import { Router } from "express";
import type { UserController } from "../controllers/user.controller.js";
import { authenticationMiddleware } from "../middleware/authentication.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

export const createUserRouter = (userController: UserController) => {
  const router = Router();

  router.post("/register", userController.register);
  router.get(
    "/:id",
    authenticationMiddleware,
    requirePermission("users:read"),
    userController.getUser,
  );
  router.patch(
    "/:id",
    authenticationMiddleware,
    requirePermission("users:update"),
    userController.updateUser,
  );

  return router;
};
