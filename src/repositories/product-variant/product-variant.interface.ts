import type { PoolClient } from "pg";
import type {
  CreateProductVariantData,
  ProductVariant,
  UpdateProductVariantData,
} from "../types/product-variant.types.js";

export interface ProductVariantRepository {
  create(
    client: PoolClient,
    data: CreateProductVariantData,
  ): Promise<ProductVariant>;

  findById(client: PoolClient, id: number): Promise<ProductVariant | null>;

  findByProductId(
    client: PoolClient,
    productId: number,
  ): Promise<ProductVariant[]>;

  update(
    client: PoolClient,
    id: number,
    data: UpdateProductVariantData,
  ): Promise<ProductVariant | null>;

  delete(client: PoolClient, id: number): Promise<boolean>;
}
