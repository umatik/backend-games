import { z } from "zod";

/** Języki sklepu, w kolejności ważności. Pierwszy jest domyślny i służy jako wartość zapasowa. */
export const LANGUAGES = ["en", "es", "pl"] as const;

export type Language = (typeof LANGUAGES)[number];

export const text = (maxLength: number) => z.string().trim().min(1).max(maxLength);

/** Tekst w kilku językach, np. `{ "pl": "lekki trzask na B2", "en": "light crackle on B2" }`. */
export const translatedText = (maxLength: number) =>
  z
    .strictObject({
      en: text(maxLength).optional(),
      es: text(maxLength).optional(),
      pl: text(maxLength).optional(),
    })
    .refine((value) => Object.values(value).some((item) => item !== undefined), {
      message: "At least one language is required",
    });

export type TranslatedText = Partial<Record<Language, string>>;
