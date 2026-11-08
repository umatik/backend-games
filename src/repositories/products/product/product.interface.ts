import type { PoolClient } from "pg";
import type {
  CreateProductRecord,
  Product,
  ProductDetails,
  ProductListQuery,
  ProductStatus,
  UpdateProductRecord,
} from "@/types/product.types.js";

export interface ProductRepository {
  create(client: PoolClient, data: CreateProductRecord): Promise<Product>;

  /** `status` ogranicza wynik do opublikowanych lub szkiców; domyślnie zwraca każdy nieusunięty produkt. */
  findById(
    id: number,
    client: PoolClient,
    status?: ProductStatus,
  ): Promise<Product | null>;

  findAllWithVariants(
    client: PoolClient,
    query: ProductListQuery,
  ): Promise<ProductDetails[]>;

  countAll(
    client: PoolClient,
    query: Omit<ProductListQuery, "page" | "limit" | "sort">,
  ): Promise<number>;

  update(
    client: PoolClient,
    id: number,
    data: UpdateProductRecord,
  ): Promise<Product | null>;

  setPublished(
    client: PoolClient,
    id: number,
    isPublished: boolean,
  ): Promise<Product | null>;

  /** Czy któryś wariant produktu trafił kiedykolwiek do zamówienia. */
  hasOrders(client: PoolClient, id: number): Promise<boolean>;

  /** Ścieżki plików mediów wszystkich wariantów produktu (do usunięcia ze storage). */
  findMediaUrls(client: PoolClient, id: number): Promise<string[]>;

  /** Miękkie usunięcie (`is_deleted`). */
  delete(client: PoolClient, id: number): Promise<boolean>;

  /** Trwałe usunięcie razem z wariantami i mediami. */
  hardDelete(client: PoolClient, id: number): Promise<boolean>;
}
