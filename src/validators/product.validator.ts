export const isValidProductName = (name: unknown): boolean => {
  return typeof name === "string" && name.trim() !== "";
};

export const isValidProductPrice = (price: unknown): boolean => {
  return typeof price === "number" && !Number.isNaN(price) && price >= 0;
};
