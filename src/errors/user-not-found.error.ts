import { AppError } from "./app.error.js";

export class UserNotFoundError extends AppError {
  constructor() {
    super("User not found", 404);
    this.name = "UserNotFoundError";
  }
}
