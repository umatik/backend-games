import type {
  CreateProductData,
  Product,
  UpdateProductData,
} from "../types/product.types.js";

export interface ProductRepository {
  create(data: CreateProductData): Promise<Product>;
  findById(id: string): Promise<Product | null>;
  findAll(): Promise<Product[]>;
  update(id: string, data: UpdateProductData): Promise<Product | null>;
  delete(id: string): Promise<boolean>;
}
