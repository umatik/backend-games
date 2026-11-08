import { z } from "zod";
import type { ProductTypeDefinition } from "./product-type.js";
import { text } from "./common.js";

/** Gadżety bez własnych pól: figurki, krzyże etiopskie, naszywki… */
export const otherType = {
  key: "other" as const,
  productAttributes: z.strictObject({}),
  variantAttributes: z.strictObject({
    /** Np. „mosiądz, 12 cm”. */
    details: text(500).optional(),
  }),
} satisfies ProductTypeDefinition;
