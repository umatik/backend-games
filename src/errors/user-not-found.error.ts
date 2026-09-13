import { AppError } from "./app.error.js";

export class UserNotFoundError extends AppError {
  constructor(userId: string) {
    super(`User ${userId} not found`, 404);
    this.name = "UserNotFoundError";
  }
}
