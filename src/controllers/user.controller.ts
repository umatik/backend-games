import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";

export class UserController {
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
}
