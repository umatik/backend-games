import type { ProductVariantMedia } from "@/types/product-variant-media.types.js";

export type ProductVariant = {
  id: number;
  productId: number;
  /** Cena w eurocentach. */
  priceEur: number;
  quantity: number;
  /** Pola zależne od typu produktu, zob. `src/product-types/`. */
  attributes: Record<string, unknown>;
  media: ProductVariantMedia[];
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type CreateProductVariantData = {
  productId: number;
  priceEur: number;
  quantity: number;
  attributes: Record<string, unknown>;
};

export type CreateProductVariantInput = Omit<CreateProductVariantData, "productId">;

export type UpdateProductVariantInput = {
  id?: number | undefined;
  priceEur?: number | undefined;
  quantity?: number | undefined;
  attributes?: Record<string, unknown> | undefined;
};

export type UpdateProductVariantData = {
  priceEur?: number | undefined;
  quantity?: number | undefined;
  attributes?: Record<string, unknown> | undefined;
};
