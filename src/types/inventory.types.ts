export type Inventory = {
  productVariantId: number;
  quantity: number;
};

export type CreateInventoryData = {
  productVariantId: number;
  quantity: number;
};

export type UpdateInventoryData = {
  quantity: number;
};
