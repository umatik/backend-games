export const isValidProductName = (name: unknown): boolean => {
  return typeof name === "string" && name.trim() !== "";
};

export const isValidProductQuantity = (quantity: unknown): boolean => {
  return (
    typeof quantity === "number" && Number.isInteger(quantity) && quantity >= 0
  );
};

export const isValidProductPrice = (price: unknown): boolean => {
  return typeof price === "number" && !Number.isNaN(price) && price >= 0;
};

export const isValidProductOption = (value: unknown): boolean => {
  return value === null || (typeof value === "string" && value.trim() !== "");
};

export const isValidProductVariantId = (id: unknown): boolean => {
  return typeof id === "number" && Number.isInteger(id) && id > 0;
};
