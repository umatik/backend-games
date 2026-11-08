import { AppError } from "./app.error.js";
import type { ValidationIssue } from "@/validators/helpers/zod.js";

export class ValidationError extends AppError {
  constructor(
    message: string,
    public readonly errors: ValidationIssue[],
  ) {
    super(message, 400);
    this.name = "ValidationError";
  }
}
