import { z } from "zod";

export const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productVariantId: z.int().positive(),
        quantity: z.int().positive(),
      }),
    )
    .min(1)
    .max(100),
});
