import { AppError } from "./app.error.js";

export class JwtAlgorithmInvalidError extends AppError {
  constructor() {
    super("JWT_ALGORITHM is invalid or not defined", 500);
    this.name = "JwtAlgorithmInvalidError";
  }
}
