import type {
  CreateProductData,
  Product,
  ProductDetails,
  UpdateProductData,
} from "../types/product.types.js";
import type { ProductVariantRepository } from "../repositories/product-variant/product-variant.interface.js";
import type { ProductRepository } from "../repositories/product/product.interface.js";
import type { UpdateProductVariantData } from "../types/product-variant.types.js";
import { ProductVariantNotFoundError } from "../errors/product-variant-not-found.error.js";
import type { PoolClient } from "pg";

export type Database = {
  connect(): Promise<PoolClient>;
};

export class ProductService {
  constructor(
    private productRepository: ProductRepository,
    private productVariantRepository: ProductVariantRepository,
    private pool: Database,
  ) {}

  async createProduct(data: CreateProductData): Promise<Product> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const product = await this.productRepository.create(client, {
        name: data.name,
      });

      for (const variant of data.variants) {
        await this.productVariantRepository.create(client, {
          productId: product.id,
          color: variant.color,
          size: variant.size,
          price: variant.price,
          quantity: variant.quantity,
        });
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

  async updateProduct(
    id: string,
    data: UpdateProductData,
  ): Promise<ProductDetails | null> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      let product: Product | null;

      if (data.name !== undefined) {
        product = await this.productRepository.update(client, id, {
          name: data.name,
        });
      } else {
        product = await this.productRepository.findById(id);
      }

      if (!product) {
        await client.query("ROLLBACK");
        return null;
      }

      if (data.variants !== undefined) {
        for (const variant of data.variants) {
          if (variant.id !== undefined) {
            const existingVariant =
              await this.productVariantRepository.findById(client, variant.id);

            if (!existingVariant || existingVariant.productId !== product.id) {
              throw new ProductVariantNotFoundError(variant.id);
            }

            const variantData: UpdateProductVariantData = {};

            if (variant.color !== undefined) {
              variantData.color = variant.color;
            }

            if (variant.size !== undefined) {
              variantData.size = variant.size;
            }

            if (variant.price !== undefined) {
              variantData.price = variant.price;
            }

            if (variant.quantity !== undefined) {
              variantData.quantity = variant.quantity;
            }

            await this.productVariantRepository.update(
              client,
              variant.id,
              variantData,
            );
          } else {
            await this.productVariantRepository.create(client, {
              productId: product.id,
              color: variant.color ?? null,
              size: variant.size ?? null,
              price: variant.price ?? 0,
              quantity: variant.quantity ?? 0,
            });
          }
        }
      }

      const variants = await this.productVariantRepository.findByProductId(
        client,
        product.id,
      );

      await client.query("COMMIT");

      return {
        ...product,
        variants,
      };
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

    const client = await this.pool.connect();

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

    const client = await this.pool.connect();

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

  async deleteProductVariant(
    productId: number,
    variantId: number,
  ): Promise<boolean> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const variant = await this.productVariantRepository.findById(
        client,
        variantId,
      );

      if (!variant || variant.productId !== productId) {
        await client.query("ROLLBACK");
        return false;
      }

      const deleted = await this.productVariantRepository.delete(
        client,
        variantId,
      );

      if (!deleted) {
        await client.query("ROLLBACK");
        return false;
      }

      await client.query("COMMIT");

      return true;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteProduct(id: string): Promise<boolean> {
    return this.productRepository.delete(id);
  }
}
