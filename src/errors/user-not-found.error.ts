import {AppError} from "@/errors/app.error.js";

export class UserNotFoundError extends AppError {
  constructor(userId: number) {
    super(`User ${userId} not found`, 404);
    this.name = "UserNotFoundError";
  }
}
