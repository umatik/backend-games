import type {
  CreateProductData,
  Product,
  UpdateProductData,
} from "../types/product.types.js";
import type { ProductRepository } from "../repositories/product.repository.js";
import type { InventoryRepository } from "../repositories/inventory.repository.js";
import { pool } from "../database/db.js";

export class ProductService {
  constructor(
    private productRepository: ProductRepository,
    private inventoryRepository: InventoryRepository,
  ) {}

  async createProduct(data: CreateProductData): Promise<Product> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const product = await this.productRepository.create(client, data);

      await this.inventoryRepository.create(client, {
        productId: product.id,
        quantity: 0,
      });

      await client.query("COMMIT");

      return product;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async updateProduct(
    id: string,
    data: UpdateProductData,
  ): Promise<Product | null> {
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
