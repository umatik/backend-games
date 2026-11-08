import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { CLAUDE_MODEL, parseWithClaude } from "./claude-client.js";

export type LabelImage = {
  data: Buffer;
  mediaType: "image/jpeg" | "image/png" | "image/webp";
};

/** To, co da się odczytać ze zdjęcia labela. Pola nieczytelne są `null`, nic nie jest zgadywane. */
export const labelReadingSchema = z.object({
  artists: z.array(z.string()),
  title: z.string().nullable(),
  label: z.string().nullable(),
  catalogNumber: z.string().nullable(),
  year: z.number().int().nullable(),
  format: z.enum(["LP", '12"', '10"', '7"']).nullable(),
  speed: z.number().int().nullable(),
  sides: z.array(
    z.object({
      side: z.string(),
      title: z.string(),
      artists: z.array(z.string()),
    }),
  ),
});

export type LabelReading = z.infer<typeof labelReadingSchema>;

export interface LabelReader {
  read(images: LabelImage[]): Promise<LabelReading>;
}

const SYSTEM_PROMPT = `You read photos of vinyl record labels for a record shop that mostly sells reggae.
Transcribe what is printed on the label; the result is used to search the record on Discogs.

- artists: performing artists as printed (for a split, e.g. a vocal on one side and a dub by another artist,
  list all of them). Do not include composers, producers, musicians or other credits.
- title: the main title. For a single (7", 10"), use the title of side A ("this side").
- label: the record label name, usually the largest logo.
- catalogNumber: exactly as printed, e.g. "ZV-7-006".
- year: only if printed on the label.
- format: "7\\"", "10\\"", "12\\"" or "LP" if it can be told from the label or catalog number, otherwise null.
- speed: 33 or 45 if printed (e.g. "45 RPM"), otherwise null.
- sides: one entry per side or track visible on the label, with its artists.

Use null (or an empty list) for anything that is missing or unreadable. Never guess.`;

export class ClaudeLabelReader implements LabelReader {
  constructor(
    private readonly client: Anthropic,
    private readonly model: string = CLAUDE_MODEL,
  ) {}

  async read(images: LabelImage[]): Promise<LabelReading> {
    return parseWithClaude(this.client, {
      model: this.model,
      system: SYSTEM_PROMPT,
      schema: labelReadingSchema,
      what: "read the label",
      content: [
        ...images.map((image) => ({
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: image.mediaType,
            data: image.data.toString("base64"),
          },
        })),
        {
          type: "text" as const,
          text:
            images.length > 1
              ? "These photos show both sides of the same record. Read the labels."
              : "Read this record label.",
        },
      ],
    });
  }
}
