import type { CreateProductData, Product } from "../types/product.types.js";

export interface ProductRepository {
  create(data: CreateProductData): Promise<Product>;
}
