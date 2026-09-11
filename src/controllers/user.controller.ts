import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../middleware/authentication.middleware.js";
import { UserService } from "../services/user.service.js";
import {
  isValidRegisterUser,
  isValidUpdateUser,
} from "../validators/user.validator.js";
import { EmailAlreadyExistsError } from "../errors/email-already-exists.error.js";

export class UserController {
  constructor(private userService: UserService) {}

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

    if (userId !== Number(req.user.userId)) {
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

    if (!isValidUpdateUser(req.body)) {
      res.status(400).json({
        message: "Invalid update data",
      });
      return;
    }

    if (userId !== Number(req.user.userId)) {
      res.status(403).json({
        message: "Forbidden",
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
