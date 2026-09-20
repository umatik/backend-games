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
  price: number;
  productId: number;
  productName: string;
  color: string | null;
  size: string | null;
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
  price: number | null;
  productId: number | null;
  productName: string;
  color: string | null;
  size: string | null;
};
