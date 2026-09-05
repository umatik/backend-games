export type CreateOrderItemData = {
  productId: string;
  quantity: number;
};

export type CreateOrderData = {
  userId: string;
  items: CreateOrderItemData[];
};

export type Order = {
  id: string;
  userId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};
