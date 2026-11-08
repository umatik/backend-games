export type CreateOrderItemData = {
  productVariantId: number;
  quantity: number;
};

export type CreateOrderData = {
  userId: number;
  items: CreateOrderItemData[];
};

export type Order = {
  id: number;
  userId: number;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type OrderItem = {
  id: number;
  productVariantId: number;
  quantity: number;
  /** Cena jednostkowa w eurocentach z chwili złożenia zamówienia. */
  priceEur: number;
  productId: number;
  productTitle: string;
  variantAttributes: Record<string, unknown>;
};

export type OrderDetails = Order & {
  items: OrderItem[];
};

export type OrderRow = {
  orderId: number;
  userId: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  itemId: number | null;
  productVariantId: number | null;
  quantity: number | null;
  priceEur: number | null;
  productId: number | null;
  productTitle: string;
  variantAttributes: Record<string, unknown>;
};
