import type { Response, NextFunction } from "express";
import { authorizationService } from "../dependency-injection.js";
import type { AuthenticatedRequest } from "./authentication.middleware.js";

export const requirePermission = (permission: string) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) => {
    if (!req.user) {
      res.status(401).json({
        message: "Unauthorized",
      });
      return;
    }

    const hasPermission = await authorizationService.hasPermission(
      Number(req.user.userId),
      permission,
    );

    if (!hasPermission) {
      res.status(403).json({
        message: "Forbidden",
      });
      return;
    }

    next();
  };
};
