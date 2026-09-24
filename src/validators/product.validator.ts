import {isValidString} from "@/validators/helpers/string.validator.js";

export const isValidProductName = (name: unknown): boolean => {
  return isValidString(name, 255);
};

export const isValidProductQuantity = (quantity: unknown): boolean => {
  return (
    typeof quantity === "number" &&
    Number.isInteger(quantity) &&
    quantity >= 0
  );
};

export const isValidProductPrice = (price: unknown): boolean => {
  return (
    typeof price === "number" &&
    Number.isFinite(price) &&
    price >= 0 &&
    price <= 99_999_999.99
  );
};

export const isValidProductOption = (value: unknown): boolean => {
  return value === null || isValidString(value, 100);
};

export const isValidProductVariantId = (id: unknown): boolean => {
  return typeof id === "number" && Number.isInteger(id) && id > 0;
};