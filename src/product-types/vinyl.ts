import { z } from "zod";
import type { ProductTypeDefinition } from "./product-type.js";
import { text, translatedText } from "./common.js";

/** Skala Goldmine (standard Discogs). */
export const GOLDMINE_GRADES = ["M", "NM", "VG+", "VG", "G+", "G", "F", "P"] as const;

export const VINYL_FORMATS = ["LP", '12"', '10"', '7"'] as const;

export const SLEEVE_CONDITIONS = [...GOLDMINE_GRADES, "generic", "no_cover"] as const;

const vinylProductAttributes = z.strictObject({
  /** Lista wykonawców: splity mają kilku, kompilacje „Various”. */
  artists: z.array(text(255)).min(1).max(20),
  tracklist: z
    .array(
      z.strictObject({
        position: text(10).optional(),
        title: text(255),
        artists: z.array(text(255)).max(20).optional(),
        duration: text(10).optional(),
      }),
    )
    .max(100)
    .default([]),
  /** Linki do odsłuchu (YouTube, Bandcamp…), tylko do osadzania. */
  previewLinks: z
    .array(z.url({ protocol: /^https?$/ }).max(2048))
    .max(20)
    .default([]),
});

const vinylVariantAttributes = z.strictObject({
  format: z.enum(VINYL_FORMATS),
  speed: z.union([z.literal(33), z.literal(45)]).optional(),
  year: z.int().min(1900).max(2100).optional(),
  label: text(255).optional(),
  /** Nie jest unikalny: ten sam numer bywa w różnych wytwórniach i reedycjach. */
  catalogNumber: text(100).optional(),
  country: text(100).optional(),
  pressing: z.enum(["original", "reissue"]).optional(),
  mediaCondition: z.enum(GOLDMINE_GRADES),
  sleeveCondition: z.enum(SLEEVE_CONDITIONS),
  conditionNote: translatedText(1000).optional(),
  discogsReleaseId: z.int().positive().optional(),
});

export type VinylProductAttributes = z.infer<typeof vinylProductAttributes>;
export type VinylVariantAttributes = z.infer<typeof vinylVariantAttributes>;

export const vinylType = {
  key: "vinyl" as const,
  productAttributes: vinylProductAttributes,
  variantAttributes: vinylVariantAttributes,
  slugParts: (attributes) => (attributes as VinylProductAttributes).artists,
  warnings: (product) => {
    const previewLinks = (product.attributes as Partial<VinylProductAttributes>)
      .previewLinks;
    const hasAudio = product.variants.some((variant) =>
      variant.media.some((media) => media.type === "audio"),
    );

    return (previewLinks?.length ?? 0) > 0 || hasAudio ? [] : ["missing_preview"];
  },
} satisfies ProductTypeDefinition;
