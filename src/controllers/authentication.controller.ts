import type {Request, Response} from "express";
import {AuthenticationService} from "@/services/authentication.service.js";
import {InvalidCredentialsError} from "@/errors/invalid-credentials.error.js";

export class AuthenticationController {
  constructor(private authService: AuthenticationService) {
  }

  login = async (req: Request, res: Response) => {
    const {email, password} = req.body;

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
      const result = await this.authService.login(
        email,
        password,
        req.ip ?? null,
        req.get("user-agent") ?? null,
      );

      res.status(200).json({
        message: "Login successful",
        user: {
          id: result.user.id,
          email: result.user.email,
        },
        token: result.token,
      });
    } catch (error) {
      if (error instanceof InvalidCredentialsError) {
        res.status(401).json({
          message: "Invalid credentials",
        });
        return;
      }

      throw error;
    }
  };
}
