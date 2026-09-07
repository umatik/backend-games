import type { PoolClient } from "pg";
import type {
  CreateProductRecord,
  Product,
  UpdateProductData,
} from "../../types/product.types.js";

export interface ProductRepository {
  create(client: PoolClient, data: CreateProductRecord): Promise<Product>;

  findById(id: string): Promise<Product | null>;

  findAll(): Promise<Product[]>;

  update(
    client: PoolClient,
    id: string,
    data: UpdateProductData,
  ): Promise<Product | null>;

  delete(id: string): Promise<boolean>;
}
