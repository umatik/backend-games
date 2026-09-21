import {AppError} from "./app.error.js";

export class JwtConfigurationError extends AppError {
  constructor(message: string) {
    super(message, 500);
    this.name = "JwtConfigurationError";
  }
}
