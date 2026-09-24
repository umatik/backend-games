import { AppError } from "@/errors/app.error.js";

export class ProductNotFoundError extends AppError {
  constructor(productId: number) {
    super(`Product ${productId} not found`, 404);
    this.name = "ProductNotFoundError";
  }
}
