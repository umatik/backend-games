import Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { ExternalServiceError } from "@/errors/external-service.error.js";

export const CLAUDE_MODEL = "claude-opus-5-5";

/**
 * Wspólne wywołanie Claude z odpowiedzią w kształcie schematu zod.
 *
 * - `effort: "low"`: odczyt labela i tłumaczenie krótkiej notatki to proste zadania, niski wysiłek wystarcza
 *   i jest najtańszy.
 * - `fallbacks: "default"`: gdy filtr bezpieczeństwa odrzuci prośbę, API samo ponawia ją na modelu zapasowym.
 */
export const parseWithClaude = async <Schema extends z.ZodType>(
  client: Anthropic,
  params: {
    system: string;
    content: Anthropic.Beta.BetaContentBlockParam[];
    schema: Schema;
    what: string;
  },
): Promise<z.infer<Schema>> => {
  let response;

  try {
    response = await client.beta.messages.parse({
      model: CLAUDE_MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: {
        effort: "low",
        format: betaZodOutputFormat(params.schema),
      },
      system: params.system,
      messages: [{ role: "user", content: params.content }],
    });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      throw new ExternalServiceError("Claude rate limit reached, try again later", error);
    }

    if (error instanceof Anthropic.APIError) {
      throw new ExternalServiceError(`Claude request failed (${error.status ?? "no status"})`, error);
    }

    throw new ExternalServiceError("Claude is not reachable", error);
  }

  if (response.stop_reason === "refusal") {
    throw new ExternalServiceError(`Claude declined to ${params.what}`);
  }

  if (response.parsed_output === null || response.parsed_output === undefined) {
    throw new ExternalServiceError(`Claude could not ${params.what}`);
  }

  return response.parsed_output as z.infer<Schema>;
};
