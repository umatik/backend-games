import type { Request, Response } from "express";
import { AuthService } from "../services/auth.service.js";

export class AuthController {
  constructor(private authService: AuthService) {}

  login = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      email.trim() === "" ||
      password.trim() === ""
    ) {
      res.status(400).json({
        message: "Email and password are required",
      });
      return;
    }

    try {
      const result = await this.authService.login(email, password);

      res.status(200).json({
        message: "Login successful",
        user: {
          id: result.user.id,
          email: result.user.email,
        },
        token: result.token,
      });
    } catch (error) {
      if (error instanceof Error && error.message === "Invalid credentials") {
        res.status(401).json({
          message: "Invalid credentials",
        });
        return;
      }

      throw error;
    }
  };
}
