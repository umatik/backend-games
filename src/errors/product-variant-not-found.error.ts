export class ProductVariantNotFoundError extends Error {
  constructor(productVariantId: number) {
    super(`Product variant ${productVariantId} not found`);
    this.name = "ProductVariantNotFoundError";
  }
}
