import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { CLAUDE_MODEL, parseWithClaude } from "./claude-client.js";

const translationSchema = z.object({
  en: z.string(),
  es: z.string(),
});

export type ConditionNoteTranslation = z.infer<typeof translationSchema>;

export interface ConditionNoteTranslator {
  /** Tłumaczy polską notatkę o stanie płyty na angielski i hiszpański. */
  translate(polishText: string): Promise<ConditionNoteTranslation>;
}

const SYSTEM_PROMPT = `You translate short condition notes for second-hand vinyl records from Polish into English
and Spanish for a record shop's product page.

Keep the meaning exact and the tone plain. Use the terms record collectors use (e.g. "crackle", "surface noise",
"ring wear", "seam split", "writing on label"). Keep grading codes, side and track markers (M, NM, VG+, A1, B2…)
unchanged. Return only the translations.`;

export class ClaudeConditionNoteTranslator implements ConditionNoteTranslator {
  constructor(
    private readonly client: Anthropic,
    private readonly model: string = CLAUDE_MODEL,
  ) {}

  async translate(polishText: string): Promise<ConditionNoteTranslation> {
    return parseWithClaude(this.client, {
      model: this.model,
      system: SYSTEM_PROMPT,
      schema: translationSchema,
      what: "translate the condition note",
      content: [{ type: "text", text: polishText }],
    });
  }
}
