export type Product = {
  id: number;
  name: string;
  price: number;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type ProductRow = {
  id: number;
  name: string;
  price: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type CreateProductData = Omit<
  Product,
  "id" | "is_deleted" | "created_at" | "deleted_at" | "updated_at"
>;

export type UpdateProductData = Partial<CreateProductData>;

export type Inventory = {
  productId: number;
  quantity: number;
};

export type CreateInventoryData = {
  productId: number;
  quantity: number;
};

export type UpdateInventoryData = {
  quantity: number;
};
