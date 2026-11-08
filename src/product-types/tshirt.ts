import { z } from "zod";
import type { ProductTypeDefinition } from "./product-type.js";
import { text } from "./common.js";

export const tshirtType = {
  key: "tshirt" as const,
  productAttributes: z.strictObject({}),
  variantAttributes: z.strictObject({
    color: text(100),
    size: text(20),
  }),
} satisfies ProductTypeDefinition;
