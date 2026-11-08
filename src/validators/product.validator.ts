import { z } from "zod";
import { getProductType } from "@/product-types/index.js";

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

export const createProductSchema = z.strictObject({
  type: z.string().refine((key) => getProductType(key) !== undefined, {
    message: "Unknown product type",
  }),
  title,
  description: description.optional(),
  attributes: attributes.default({}),
  variants: z.array(createProductVariantSchema).max(100).default([]),
});

export const updateProductVariantSchema = z
  .strictObject({
    id: z.int().positive().optional(),
    priceEur: priceEur.optional(),
    quantity: quantity.optional(),
    attributes: attributes.optional(),
  })
  .refine((variant) => variant.id !== undefined || variant.priceEur !== undefined, {
    message: "New variant requires priceEur",
    path: ["priceEur"],
  });

export const updateProductSchema = z
  .strictObject({
    title: title.optional(),
    description: description.optional(),
    attributes: attributes.optional(),
    variants: z.array(updateProductVariantSchema).max(100).optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "At least one field is required",
  });

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
