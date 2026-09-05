export class InsufficientStockError extends Error {
  constructor(productId: string) {
    super(`Insufficient stock for product ${productId}`);
    this.name = "InsufficientStockError";
  }
}
