import type { ProductVariantMedia } from "@/types/product-variant-media.types.js";

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
