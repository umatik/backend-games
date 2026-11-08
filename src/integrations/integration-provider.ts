import Anthropic from "@anthropic-ai/sdk";
import type { SettingsService } from "@/services/settings.service.js";
import { ClaudeLabelReader, type LabelReader } from "./claude/label-reader.js";
import { CLAUDE_MODEL } from "./claude/claude-client.js";
import {
  ClaudeConditionNoteTranslator,
  type ConditionNoteTranslator,
} from "./claude/condition-note-translator.js";
import { type DiscogsClient, HttpDiscogsClient } from "./discogs/discogs-client.js";
import { ExternalServiceError } from "@/errors/external-service.error.js";

/** Dostęp do integracji; `null` oznacza „nie skonfigurowano”. */
export interface IntegrationProvider {
  getLabelReader(): Promise<LabelReader | null>;
  getConditionNoteTranslator(): Promise<ConditionNoteTranslator | null>;
  getDiscogs(): Promise<DiscogsClient | null>;
}

export type ConnectionTestResult = { ok: true } | { ok: false; message: string };

/**
 * Integracje budowane z ustawień (panel admina → zmienne środowiskowe). Klienci są tworzeni na nowo,
 * gdy zmieni się klucz albo model, więc zmiana w ustawieniach działa bez restartu serwera.
 */
export class SettingsIntegrationProvider implements IntegrationProvider {
  private claude: { key: string; client: Anthropic } | null = null;
  private discogs: { key: string; client: DiscogsClient } | null = null;

  constructor(
    private readonly settings: SettingsService,
    private readonly options: { enabled: boolean } = { enabled: true },
  ) {
    settings.onChange(() => {
      this.claude = null;
      this.discogs = null;
    });
  }

  async getLabelReader(): Promise<LabelReader | null> {
    const claude = await this.getClaude();

    return claude ? new ClaudeLabelReader(claude.client, claude.model) : null;
  }

  async getConditionNoteTranslator(): Promise<ConditionNoteTranslator | null> {
    const claude = await this.getClaude();

    return claude ? new ClaudeConditionNoteTranslator(claude.client, claude.model) : null;
  }

  async getDiscogs(): Promise<DiscogsClient | null> {
    if (!this.options.enabled) {
      return null;
    }

    const token = await this.settings.get("discogsToken");
    const userAgent = (await this.settings.get("discogsUserAgent")) ?? "RasBassShop/1.0";

    if (!token) {
      return null;
    }

    const key = `${token}\u0000${userAgent}`;

    if (this.discogs?.key !== key) {
      this.discogs = { key, client: new HttpDiscogsClient(token, userAgent) };
    }

    return this.discogs.client;
  }

  /** Sprawdza klucz Claude zapytaniem o model (bez generowania tekstu, więc bez kosztów). */
  async testClaude(): Promise<ConnectionTestResult> {
    const claude = await this.getClaude();

    if (!claude) {
      return { ok: false, message: "Claude API key is not set" };
    }

    try {
      await claude.client.models.retrieve(claude.model);
      return { ok: true };
    } catch (error) {
      if (error instanceof Anthropic.AuthenticationError) {
        return { ok: false, message: "Claude rejected the API key" };
      }

      if (error instanceof Anthropic.APIError) {
        return { ok: false, message: `Claude responded with ${error.status ?? "an error"}` };
      }

      return { ok: false, message: "Claude is not reachable" };
    }
  }

  /** Sprawdza token Discogs jednym małym wyszukiwaniem. */
  async testDiscogs(): Promise<ConnectionTestResult> {
    const discogs = await this.getDiscogs();

    if (!discogs) {
      return { ok: false, message: "Discogs token is not set" };
    }

    try {
      await discogs.search({ catno: "ZV-7-006" }, 1);
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof ExternalServiceError ? error.message : "Discogs is not reachable",
      };
    }
  }

  private async getClaude(): Promise<{ client: Anthropic; model: string } | null> {
    if (!this.options.enabled) {
      return null;
    }

    const apiKey = await this.settings.get("anthropicApiKey");
    const model = (await this.settings.get("claudeModel")) ?? CLAUDE_MODEL;

    if (!apiKey) {
      return null;
    }

    if (this.claude?.key !== apiKey) {
      this.claude = {
        key: apiKey,
        client: new Anthropic({ apiKey, timeout: 60_000, maxRetries: 2 }),
      };
    }

    return { client: this.claude.client, model };
  }
}
