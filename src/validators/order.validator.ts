export const isValidOrderUserId = (userId: unknown): boolean => {
  return typeof userId === "string" && userId.trim() !== "";
};

export const isValidOrderItem = (item: unknown): boolean => {
  if (typeof item !== "object" || item === null) {
    return false;
  }

  const { productId, quantity } = item as {
    productId?: unknown;
    quantity?: unknown;
  };

  return (
    typeof productId === "string" &&
    productId.trim() !== "" &&
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
