import { AppError } from "@/errors/app.error.js";

export class FileExtensionIsRequiredError extends AppError {
  constructor() {
    super("File extension is required", 400);
    this.name = "FileExtensionIsRequiredError";
  }
}
