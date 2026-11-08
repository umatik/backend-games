import type { ProductTypeDefinition } from "./product-type.js";
import { vinylType } from "./vinyl.js";
import { tshirtType } from "./tshirt.js";
import { otherType } from "./other.js";

export type { ProductTypeDefinition } from "./product-type.js";

/** Rejestr typów produktów. Nowy typ = nowy plik + wpis tutaj. */
export const productTypes = [vinylType, tshirtType, otherType] as const;

export type ProductTypeKey = (typeof productTypes)[number]["key"];

const productTypesByKey = new Map<string, ProductTypeDefinition>(
  productTypes.map((type) => [type.key, type]),
);

export const getProductType = (key: string): ProductTypeDefinition | undefined =>
  productTypesByKey.get(key);

export const isProductTypeKey = (key: string): key is ProductTypeKey =>
  productTypesByKey.has(key);
