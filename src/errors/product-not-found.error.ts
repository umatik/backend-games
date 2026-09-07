export class ProductNotFoundError extends Error {
  constructor(productId: number) {
    super(`Product ${productId} not found`);

    this.name = "ProductNotFoundError";
  }
}
