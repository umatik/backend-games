import { AppError } from "./app.error.js";

export class ProductNotFoundError extends AppError {
  constructor() {
    super("Product not found", 404);
    this.name = "ProductNotFoundError";
  }
}
