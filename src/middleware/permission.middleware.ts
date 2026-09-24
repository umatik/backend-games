import type {Response, NextFunction} from "express";
import type {AuthenticatedRequest} from "@/middleware/authentication.middleware.js";
import type {AuthorizationService} from "@/services/authorization.service.js";

export const requirePermission = (authorizationService: AuthorizationService, permission: string) => {
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
