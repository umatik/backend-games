import { AppError } from "@/errors/app.error.js";

export class UnsupportedMediaTypeError extends AppError {
  constructor() {
    super("Unsupported media type", 415);
    this.name = "UnsupportedMediaTypeError";
  }
}
