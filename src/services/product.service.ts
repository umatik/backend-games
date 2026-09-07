import type {
  CreateProductData,
  Product,
  ProductDetails,
  UpdateProductData,
} from "../types/product.types.js";
import { pool } from "../database/db.js";
import type { ProductVariantRepository } from "../repositories/product-variant/product-variant.interface.js";
import type { ProductRepository } from "../repositories/product/product.interface.js";

export class ProductService {
  constructor(
    private productRepository: ProductRepository,
    private productVariantRepository: ProductVariantRepository,
  ) {}

  async createProduct(data: CreateProductData): Promise<Product> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const product = await this.productRepository.create(client, data);

      await this.productVariantRepository.create(client, {
        productId: product.id,
        color: null,
        size: null,
        price: product.price,
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

  async getProduct(id: string): Promise<ProductDetails | null> {
    const product = await this.productRepository.findById(id);

    if (!product) {
      return null;
    }

    const client = await pool.connect();

    try {
      const variants = await this.productVariantRepository.findByProductId(
        client,
        product.id,
      );

      return {
        ...product,
        variants,
      };
    } finally {
      client.release();
    }
  }

  async getAllProducts(): Promise<ProductDetails[]> {
    const products = await this.productRepository.findAll();

    const client = await pool.connect();

    try {
      return await Promise.all(
        products.map(async (product) => {
          const variants = await this.productVariantRepository.findByProductId(
            client,
            product.id,
          );

          return {
            ...product,
            variants,
          };
        }),
      );
    } finally {
      client.release();
    }
  }

  async deleteProduct(id: string): Promise<boolean> {
    return this.productRepository.delete(id);
  }
}
