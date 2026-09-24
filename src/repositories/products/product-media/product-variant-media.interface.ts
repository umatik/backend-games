import type { PoolClient } from "pg";
import type { ProductVariantMediaType } from "@/types/product-variant-media.types.js";

export interface ProductVariantMedia {
  id: number;
  productVariantId: number;
  type: ProductVariantMediaType;
  url: string;
  alt: string | null;
  sortOrder: number;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductVariantMediaInterface {
  findByProductVariantId(
    client: PoolClient,
    productVariantId: number,
  ): Promise<ProductVariantMedia[]>;

  findById(
    client: PoolClient,
    mediaId: number,
  ): Promise<ProductVariantMedia | null>;

  create(
    client: PoolClient,
    productVariantId: number,
    type: ProductVariantMediaType,
    url: string,
    alt: string | null,
    sortOrder: number,
    isPrimary: boolean,
  ): Promise<ProductVariantMedia>;

  update(
    client: PoolClient,
    mediaId: number,
    type: ProductVariantMediaType,
    url: string,
    alt: string | null,
    sortOrder: number,
    isPrimary: boolean,
  ): Promise<ProductVariantMedia | null>;

  delete(client: PoolClient, mediaId: number): Promise<boolean>;
}
