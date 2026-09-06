import type {
  CreateProductData,
  Product,
  UpdateProductData,
} from "../types/product.types.js";
import type { PoolClient } from "pg";

export interface ProductRepository {
  create(client: PoolClient, data: CreateProductData): Promise<Product>;
  findById(id: string): Promise<Product | null>;
  findAll(): Promise<Product[]>;
  update(id: string, data: UpdateProductData): Promise<Product | null>;
  delete(id: string): Promise<boolean>;
}
