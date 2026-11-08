import type {
  CreateProductVariantInput,
  ProductVariant,
  UpdateProductVariantInput,
} from "./product-variant.types.js";

export type Product = {
  id: number;
  /** Klucz typu z rejestru `src/product-types/`. */
  type: string;
  title: string;
  slug: string;
  description: string | null;
  isPublished: boolean;
  /** Pola zależne od typu produktu, zob. `src/product-types/`. */
  attributes: Record<string, unknown>;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type ProductDetails = Product & {
  variants: ProductVariant[];
};

export type CreateProductData = {
  type: string;
  title: string;
  description?: string | null | undefined;
  attributes: Record<string, unknown>;
  variants: CreateProductVariantInput[];
};

export type CreateProductRecord = {
  type: string;
  title: string;
  description: string | null;
  attributes: Record<string, unknown>;
  /** Początek sluga; repozytorium dokleja `-{id}`, co gwarantuje unikalność. */
  slugBase: string;
};

export type UpdateProductData = {
  title?: string | undefined;
  description?: string | null | undefined;
  attributes?: Record<string, unknown> | undefined;
  variants?: UpdateProductVariantInput[] | undefined;
};

export type UpdateProductRecord = Omit<UpdateProductData, "variants">;
