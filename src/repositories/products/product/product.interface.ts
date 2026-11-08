import type { PoolClient } from "pg";
import type {
  CreateProductRecord,
  Product,
  ProductDetails,
  UpdateProductRecord,
} from "@/types/product.types.js";

export interface ProductRepository {
  create(client: PoolClient, data: CreateProductRecord): Promise<Product>;

  findById(id: number, client: PoolClient): Promise<Product | null>;

  findAllWithVariants(
    client: PoolClient,
    page: number,
    limit: number,
  ): Promise<ProductDetails[]>;

  update(
    client: PoolClient,
    id: number,
    data: UpdateProductRecord,
  ): Promise<Product | null>;

  delete(client: PoolClient, id: number): Promise<boolean>;

  countAll(client: PoolClient): Promise<number>;
}
