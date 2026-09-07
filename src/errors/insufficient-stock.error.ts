export class InsufficientStockError extends Error {
  constructor(productId: number) {
    super(`Insufficient stock for product ${productId}`);
    this.name = "InsufficientStockError";
  }
}
