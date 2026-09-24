import { AppError } from "@/errors/app.error.js";

export class ProductVariantNotFoundError extends AppError {
  constructor(productVariantId: number) {
    super(`Product variant ${productVariantId} not found`, 404);
    this.name = "ProductVariantNotFoundError";
  }
}
