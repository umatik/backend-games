import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { UserService } from "../services/user.service.js";
import { isValidRegisterUser } from "../validators/user.validator.js";

export class UserController {
  constructor(private userService: UserService) {}

  getUser = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.params.id;

    if (!req.user) {
      res.status(401).json({
        message: "Unauthorized",
      });
      return;
    }

    if (userId !== req.user.userId) {
      res.status(403).json({
        message: "Forbidden",
      });
      return;
    }

    res.status(200).json({
      user: {
        id: req.user.userId,
        email: req.user.email,
      },
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
  };
}
