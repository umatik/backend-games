import { AppError } from "./app.error.js";

export class EmailAlreadyExistsError extends AppError {
  constructor() {
    super("Email already exists", 409);
    this.name = "EmailAlreadyExistsError";
  }
}
