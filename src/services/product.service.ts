import type {
  CreateProductData,
  Product,
  UpdateProductData,
} from "../types/product.types.js";
import type { ProductRepository } from "../repositories/product.repository.js";

export class ProductService {
  constructor(private productRepository: ProductRepository) {}

  async createProduct(data: CreateProductData): Promise<Product> {
    return this.productRepository.create(data);
  }

  async updateProduct(id: string, data: UpdateProductData): Promise<Product | null> {
    return this.productRepository.update(id, data);
  }

  async getProduct(id: string): Promise<Product | null> {
    return this.productRepository.findById(id);
  }

  async getAllProducts(): Promise<Product[]> {
    return this.productRepository.findAll();
  }

  async deleteProduct(id: string): Promise<boolean> {
    return this.productRepository.delete(id);
  }
}
