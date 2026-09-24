import {AppError} from "@/errors/app.error.js";

export class InvalidCredentialsError extends AppError {
  constructor() {
    super("Invalid credentials", 401);
    this.name = "InvalidCredentialsError";
  }
}
