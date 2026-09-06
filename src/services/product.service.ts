import type {
  CreateProductData,
  Product,
  UpdateProductData,
} from "../types/product.types.js";
import { pool } from "../database/db.js";
import type { ProductVariantRepository } from "../repositories/product-variant/product-variant.interface.js";
import type { ProductRepository } from "../repositories/product/product.interface.js";
import type { InventoryRepository } from "../repositories/inventory/inventory.interface.js";

export class ProductService {
  constructor(
    private productRepository: ProductRepository,
    private productVariantRepository: ProductVariantRepository,
    private inventoryRepository: InventoryRepository,
  ) {}

  async createProduct(data: CreateProductData): Promise<Product> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const product = await this.productRepository.create(client, data);

      const variant = await this.productVariantRepository.create(client, {
        productId: product.id,
        color: null,
        size: null,
        price: product.price,
      });

      await this.inventoryRepository.create(client, {
        productVariantId: variant.id,
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
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const product = await this.productRepository.update(client, id, data);

      if (!product) {
        await client.query("ROLLBACK");
        return null;
      }

      await client.query("COMMIT");

      return product;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
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
