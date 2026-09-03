import type { CreateProductData, Product } from "../types/product.types.js";
import type { ProductRepository } from "../repositories/product.repository.js";

export class ProductService {
  constructor(private productRepository: ProductRepository) {}

  async createProduct(data: CreateProductData): Promise<Product> {
    return this.productRepository.create(data);
  }
}
