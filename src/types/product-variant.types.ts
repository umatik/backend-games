export type ProductVariant = {
  id: number;
  productId: number;
  color: string | null;
  size: string | null;
  price: number;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateProductVariantData = {
  productId: number;
  color: string | null;
  size: string | null;
  price: number;
};

export type UpdateProductVariantData = Partial<
  Omit<CreateProductVariantData, "productId">
>;
