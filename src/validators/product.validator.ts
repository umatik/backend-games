import { z } from "zod";
import { getProductType } from "@/product-types/index.js";
import { PRODUCT_SORTS } from "@/types/product.types.js";

/** Cena w eurocentach (12000 = 120,00 €). */
const priceEur = z.int().min(0).max(99_999_999);
const quantity = z.int().min(0).max(1_000_000);
const attributes = z.record(z.string(), z.unknown());
const title = z.string().trim().min(1).max(255);
const description = z.string().trim().max(10_000).nullable();

export const createProductVariantSchema = z.strictObject({
  priceEur,
  quantity: quantity.default(1),
  attributes: attributes.default({}),
});

export const updateProductVariantSchema = z
  .strictObject({
    priceEur: priceEur.optional(),
    quantity: quantity.optional(),
    attributes: attributes.optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "At least one field is required",
  });

export const createProductSchema = z.strictObject({
  type: z.string().refine((key) => getProductType(key) !== undefined, {
    message: "Unknown product type",
  }),
  title,
  description: description.optional(),
  attributes: attributes.default({}),
  variants: z.array(createProductVariantSchema).max(100).default([]),
});

export const updateProductSchema = z
  .strictObject({
    title: title.optional(),
    description: description.optional(),
    attributes: attributes.optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "At least one field is required",
  });

const queryText = z.string().trim().min(1).max(255).optional();
const queryPrice = z.coerce.number().int().min(0).max(99_999_999).optional();

/** Filtry listy produktów (query string). Paginację sprawdza osobno `isValidPagination`. */
export const productListFiltersSchema = z.object({
  type: queryText,
  artist: queryText,
  format: queryText,
  mediaCondition: queryText,
  label: queryText,
  priceMinEur: queryPrice,
  priceMaxEur: queryPrice,
  available: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  q: queryText,
  sort: z.enum(PRODUCT_SORTS).default("newest"),
});

/** Dodatkowy filtr listy dla panelu admina. */
export const productStatusSchema = z
  .enum(["published", "draft", "all"])
  .default("all");

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
