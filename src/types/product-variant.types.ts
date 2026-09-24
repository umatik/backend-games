import type { ProductVariantMedia } from "@/types/product-variant-media.types.js";

export type ProductVariant = {
  id: number;
  productId: number;
  color: string | null;
  size: string | null;
  media: ProductVariantMedia[];
  price: number;
  quantity: number;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type CreateProductVariantData = {
  productId: number;
  color: string | null;
  size: string | null;
  price: number;
  quantity: number;
};

export type CreateProductVariantInput = {
  color: string | null;
  size: string | null;
  price: number;
  quantity: number;
};

export type UpdateProductVariantInput = {
  id?: number;
  color?: string | null;
  size?: string | null;
  price?: number;
  quantity?: number;
};

export type UpdateProductVariantData = Partial<
  Omit<CreateProductVariantData, "productId">
>;
