import {Router} from "express";
import type {UserController} from "../controllers/user.controller.js";
import {authenticationMiddleware} from "../middleware/authentication.middleware.js";
import {requirePermission} from "../middleware/permission.middleware.js";
import type {AuthorizationService} from "../services/authorization.service.js";

export const createUserRouter = (
  userController: UserController,
  authorizationService: AuthorizationService,
) => {
  const router = Router();

  /**
   * @openapi
   * /users:
   *   get:
   *     tags:
   *       - Users
   *     summary: Get users
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 20
   *     responses:
   *       200:
   *         description: Users found
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.get(
    "/",
    authenticationMiddleware,
    requirePermission(authorizationService, "users:read"),
    userController.getUsers,
  );

  /**
   * @openapi
   * /users/{id}:
   *   get:
   *     tags:
   *       - Users
   *     summary: Get user by ID
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *           format: int64
   *     responses:
   *       200:
   *         description: User found
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   *       404:
   *         description: User not found
   */
  router.get(
    "/:id",
    authenticationMiddleware,
    userController.getUser,
  );


  /**
   * @openapi
   * /users/register:
   *   post:
   *     tags:
   *       - Users
   *     summary: Register a new user
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
   *       201:
   *         description: User registered successfully
   *       400:
   *         description: Invalid request
   *       409:
   *         description: Email already exists
   */
  router.post("/register", userController.register);

  /**
   * @openapi
   * /users/{id}:
   *   patch:
   *     tags:
   *       - Users
   *     summary: Update a user
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *           format: int64
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *     responses:
   *       200:
   *         description: User updated
   *       400:
   *         description: Invalid request
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   *       404:
   *         description: User not found
   *       409:
   *         description: Email already exists
   */
  router.patch(
    "/:id",
    authenticationMiddleware,
    requirePermission(authorizationService, "users:update"),
    userController.updateUser,
  );

  return router;
};