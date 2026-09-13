import { AppError } from "./app.error.js";

export class InsufficientStockError extends AppError {
  constructor(productId: number) {
    super(`Insufficient stock for product ${productId}`, 409);
    this.name = "InsufficientStockError";
  }
}
