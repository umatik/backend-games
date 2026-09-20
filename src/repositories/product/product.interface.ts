import type {PoolClient} from "pg";
import type {
  CreateProductRecord,
  Product, ProductDetails,
  UpdateProductData,
} from "../../types/product.types.js";

export interface ProductRepository {
  create(client: PoolClient, data: CreateProductRecord): Promise<Product>;

  findById(id: number, client: PoolClient): Promise<Product | null>;

  findAll(client: PoolClient): Promise<Product[]>;

  findAllWithVariants(client: PoolClient): Promise<ProductDetails[]>;

  update(
    client: PoolClient,
    id: number,
    data: UpdateProductData,
  ): Promise<Product | null>;

  delete(client: PoolClient, id: number): Promise<boolean>;
}
