export const isValidOrderUserId = (userId: unknown): boolean => {
  return typeof userId === "string" && userId.trim() !== "";
};

export const isValidOrderItem = (item: unknown): boolean => {
  if (typeof item !== "object" || item === null) {
    return false;
  }

  const { productVariantId, quantity } = item as {
    productVariantId?: unknown;
    quantity?: unknown;
  };

  return (
    typeof productVariantId === "number" &&
    Number.isInteger(productVariantId) &&
    productVariantId > 0 &&
    typeof quantity === "number" &&
    Number.isInteger(quantity) &&
    quantity > 0
  );
};

export const isValidOrderItems = (items: unknown): boolean => {
  return (
    Array.isArray(items) && items.length > 0 && items.every(isValidOrderItem)
  );
};
