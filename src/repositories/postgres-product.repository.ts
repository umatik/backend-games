import type { CreateProductData, Product } from "../types/product.types.js";
import type { ProductRepository } from "./product.repository.js";

export class PostgresProductRepository implements ProductRepository {
  async create(data: CreateProductData): Promise<Product> {
    return {
      id: "1",
      name: data.name,
      price: data.price,
    };
  }
}
