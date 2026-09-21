import { AppError } from "./app.error.js";

export class JwtSecretNotDefinedError extends AppError {
  constructor() {
    super("JWT_SECRET is not defined", 500);
    this.name = "JwtSecretNotDefinedError";
  }
}
