import type {Request, Response} from "express";
import type {AuthenticatedRequest} from "../middleware/authentication.middleware.js";
import {UserService} from "../services/user.service.js";
import {AuthorizationService} from "../services/authorization.service.js";
import {
  isValidRegisterUser,
  isValidUpdateUser,
} from "../validators/user.validator.js";
import {EmailAlreadyExistsError} from "../errors/email-already-exists.error.js";
import {createPagination} from "../utils/pagination.js";
import {isValidPagination} from "../validators/helpers/pagination.validator.js";

export class UserController {
  constructor(
    private userService: UserService,
    private authorizationService: AuthorizationService,
  ) {
  }

  getUsers = async (req: Request, res: Response) => {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);

    if (!isValidPagination(page, limit)) {
      res.status(400).json({
        message: "Invalid pagination parameters",
      });
      return;
    }

    const {users, total} = await this.userService.getUsers(page, limit);

    res.status(200).json({
      message: "Users found",
      users,
      pagination: createPagination(page, limit, total),
    });
  };

  getUser = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({
        message: "Unauthorized",
      });
      return;
    }

    const userId = Number(req.params.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      res.status(400).json({
        message: "Invalid user id",
      });
      return;
    }

    const isAdmin = await this.authorizationService.hasRole(
      Number(req.user.userId),
      "admin",
    );

    if (userId !== Number(req.user.userId) && !isAdmin) {
      res.status(403).json({
        message: "Forbidden",
      });
      return;
    }

    const user = await this.userService.getUserById(userId);

    if (!user) {
      res.status(404).json({
        message: "User not found",
      });
      return;
    }

    res.status(200).json({
      message: "User found",
      user,
    });
  };

  register = async (req: Request, res: Response) => {
    if (!isValidRegisterUser(req.body)) {
      res.status(400).json({
        message: "Invalid registration data",
      });
      return;
    }

    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      address,
      city,
      postalCode,
      country,
    } = req.body;

    try {
      const user = await this.userService.register({
        email,
        password,
        firstName,
        lastName,
        phone,
        address,
        city,
        postalCode,
        country,
      });

      res.status(201).json({
        message: "User registered",
        user,
      });
    } catch (error) {
      if (error instanceof EmailAlreadyExistsError) {
        res.status(409).json({
          message: error.message,
        });
        return;
      }

      throw error;
    }
  };

  updateUser = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({
        message: "Unauthorized",
      });
      return;
    }

    const userId = Number(req.params.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      res.status(400).json({
        message: "Invalid user id",
      });
      return;
    }

    const isAdmin = await this.authorizationService.hasRole(
      Number(req.user.userId),
      "admin",
    );

    if (userId !== Number(req.user.userId) && !isAdmin) {
      res.status(403).json({
        message: "Forbidden",
      });
      return;
    }

    if (!isValidUpdateUser(req.body)) {
      res.status(400).json({
        message: "Invalid update data",
      });
      return;
    }
    
    const user = await this.userService.updateUser(userId, req.body);

    if (!user) {
      res.status(404).json({
        message: "User not found",
      });
      return;
    }

    res.status(200).json({
      message: "User updated",
      user,
    });
  };
}