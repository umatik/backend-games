export type ProductVariant = {
  id: number;
  productId: number;
  color: string | null;
  size: string | null;
  price: number;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateProductVariantData = {
  productId: number;
  color: string | null;
  size: string | null;
  price: number;
  quantity: number;
};

export type UpdateProductVariantData = Partial<
  Omit<CreateProductVariantData, "productId">
>;
