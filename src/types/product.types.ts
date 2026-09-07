import type {
  CreateProductVariantInput,
  ProductVariant,
  UpdateProductVariantInput,
} from "./product-variant.types.js";

export type Product = {
  id: number;
  name: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type ProductRow = {
  id: number;
  name: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type CreateProductData = {
  name: string;
  variants: CreateProductVariantInput[];
};

export type CreateProductRecord = {
  name: string;
};

export type UpdateProductData = {
  name?: string;
  variants?: UpdateProductVariantInput[];
};
export type ProductDetails = Product & {
  variants: ProductVariant[];
};
