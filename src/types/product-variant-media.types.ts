export type ProductVariantMediaType = "photo" | "video" | "audio" | "document";

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
