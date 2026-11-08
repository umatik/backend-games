import type { ProductVariantMedia } from "@/types/product-variant-media.types.js";
import { z } from "zod";

const MEDIA_TYPES: Record<
  ProductVariantMedia["type"],
  {
    mimeTypes: string[];
    extensions: string[];
  }
> = {
  photo: {
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    extensions: [".jpg", ".jpeg", ".png", ".webp", ".gif"],
  },

  video: {
    mimeTypes: ["video/mp4", "video/quicktime"],
    extensions: [".mp4", ".mov"],
  },

  audio: {
    mimeTypes: ["audio/mpeg", "audio/wav", "audio/x-wav", "audio/wave"],
    extensions: [".mp3", ".wav"],
  },

  document: {
    mimeTypes: ["application/pdf", "application/zip"],
    extensions: [".pdf", ".zip"],
  },
};

export function getProductVariantMediaType(
  filename: string,
  contentType: string,
): ProductVariantMedia["type"] | null {
  const extension = filename.slice(filename.lastIndexOf(".")).toLowerCase();

  for (const [type, config] of Object.entries(MEDIA_TYPES)) {
    if (
      config.mimeTypes.includes(contentType) &&
      config.extensions.includes(extension)
    ) {
      return type as ProductVariantMedia["type"];
    }
  }

  return null;
}

/**
 * Pola mediów przychodzą jako tekst z formularza multipart (przy wgrywaniu) albo jako JSON (przy edycji),
 * dlatego `sortOrder` i `isPrimary` przyjmujemy w obu postaciach.
 */
export const productVariantMediaInputSchema = z.object({
  alt: z.string().trim().min(1).max(255).nullish().transform((value) => value ?? null),
  sortOrder: z.coerce.number().int().min(0),
  isPrimary: z.union([
    z.boolean(),
    z.enum(["true", "false"]).transform((value) => value === "true"),
  ]),
});
