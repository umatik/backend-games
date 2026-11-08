import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "@/middleware/authentication.middleware.js";
import { UserService } from "@/services/user.service.js";
import { AuthorizationService } from "@/services/authorization.service.js";
import {
  forgotPasswordSchema,
  registerUserSchema,
  resetPasswordSchema,
  updateUserSchema,
} from "../validators/user.validator.js";
import { EmailAlreadyExistsError } from "@/errors/email-already-exists.error.js";
import { createPagination } from "@/utils/pagination.js";
import { isValidPagination } from "@/validators/helpers/pagination.validator.js";
import type { PasswordResetService } from "@/services/password-reset.service.js";
import { formatZodIssues } from "@/validators/helpers/zod.js";

export class UserController {
  constructor(
    private userService: UserService,
    private authorizationService: AuthorizationService,
    private passwordResetService: PasswordResetService,
  ) {}

  getUsers = async (req: Request, res: Response) => {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);

    if (!isValidPagination(page, limit)) {
      res.status(400).json({
        message: "Invalid pagination parameters",
      });
      return;
    }

    const { users, total } = await this.userService.getUsers(page, limit);

    res.status(200).json({
      message: "Users found",
      users,
      pagination: createPagination(page, limit, total),
    });
  };

  /** Zalogowany użytkownik i jego uprawnienia, np. żeby panel wiedział, co pokazać. */
  getMe = async (req: AuthenticatedRequest, res: Response) => {
    const userId = Number(req.user?.userId);
    const user = Number.isInteger(userId) ? await this.userService.getUserById(userId) : null;

    // Token jest ważny, ale konta już nie ma.
    if (!user) {
      res.status(401).json({
        message: "Unauthorized",
      });
      return;
    }

    res.status(200).json({
      message: "Current user",
      user,
      permissions: await this.authorizationService.getPermissions(userId),
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

    if (userId !== Number(req.user.userId)) {
      const isAdmin = await this.authorizationService.hasRole(
        Number(req.user.userId),
        "admin",
      );

      if (!isAdmin) {
        res.status(403).json({
          message: "Forbidden",
        });
        return;
      }
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
    const parsed = registerUserSchema.safeParse(req.body ?? {});

    if (!parsed.success) {
      res.status(400).json({
        message: "Invalid registration data",
        errors: formatZodIssues(parsed.error),
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
    } = parsed.data;

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

    if (userId !== Number(req.user.userId)) {
      const isAdmin = await this.authorizationService.hasRole(
        Number(req.user.userId),
        "admin",
      );

      if (!isAdmin) {
        res.status(403).json({
          message: "Forbidden",
        });
        return;
      }
    }

    const parsed = updateUserSchema.safeParse(req.body ?? {});

    if (!parsed.success) {
      res.status(400).json({
        message: "Invalid update data",
        errors: formatZodIssues(parsed.error),
      });
      return;
    }

    const user = await this.userService.updateUser(userId, parsed.data);

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

  forgotPassword = async (req: Request, res: Response) => {
    const parsed = forgotPasswordSchema.safeParse(req.body ?? {});

    if (!parsed.success) {
      res.status(400).json({
        message: "Invalid email",
        errors: formatZodIssues(parsed.error),
      });
      return;
    }

    await this.passwordResetService.forgotPassword(parsed.data.email);

    res.status(200).json({
      message: "If the account exists, a password reset email has been sent",
    });
  };

  resetPassword = async (req: Request, res: Response) => {
    const parsed = resetPasswordSchema.safeParse(req.body ?? {});

    if (!parsed.success) {
      res.status(400).json({
        message: "Invalid reset password data",
        errors: formatZodIssues(parsed.error),
      });
      return;
    }

    const reset = await this.passwordResetService.resetPassword(
      parsed.data.token,
      parsed.data.password,
    );

    if (!reset) {
      res.status(400).json({
        message: "Invalid or expired reset token",
      });
      return;
    }

    res.status(200).json({
      message: "Password reset successfully",
    });
  };
}
