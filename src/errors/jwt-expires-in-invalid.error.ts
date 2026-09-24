import { AppError } from "@/errors/app.error.js";

export class JwtExpiresInInvalidError extends AppError {
  constructor() {
    super("JWT_EXPIRES_IN is invalid or not defined", 500);
    this.name = "JwtExpiresInInvalidError";
  }
}
