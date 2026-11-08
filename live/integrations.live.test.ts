import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import Anthropic from "@anthropic-ai/sdk";
import "@/config/env.js";
import { CLAUDE_MODEL } from "@/integrations/claude/claude-client.js";
import { ClaudeLabelReader } from "@/integrations/claude/label-reader.js";
import { ClaudeConditionNoteTranslator } from "@/integrations/claude/condition-note-translator.js";
import { HttpDiscogsClient } from "@/integrations/discogs/discogs-client.js";
import type { IntegrationProvider } from "@/integrations/integration-provider.js";
import { RecordLookupService } from "@/services/record-lookup.service.js";
import { NbpExchangeRateProvider } from "@/services/exchange-rate.service.js";
import { LocalStorage } from "@/storage/local-storage.js";
import type { Cache } from "@/cache/cache.interface.js";
import type { Database } from "@/database/database.interface.js";
import type {
  PendingUpload,
  PendingUploadRepository,
} from "@/repositories/pending-upload/pending-upload.interface.js";
import type { PoolClient } from "pg";

/**
 * Testy na prawdziwych usługach. Sprawdzają, czy Claude, Discogs i NBP wciąż odpowiadają tak, jak zakłada kod
 * (format odpowiedzi, model, wyszukiwanie). Klucze z `.env`; bez klucza dana grupa jest pomijana.
 *
 * Dane referencyjne: split 7" Zulu Vibes ZV-7-006 (Bunnington Judah – Jah Prophecy / Zulu Vibes – Prophetic Dub),
 * wydanie Discogs 34434571. Sprawdzenia są luźne, bo odczyt Claude może się nieco różnić między uruchomieniami.
 */

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? "";
const DISCOGS_TOKEN = process.env.DISCOGS_TOKEN ?? "";
const DISCOGS_USER_AGENT = process.env.DISCOGS_USER_AGENT || "RasBassShop/1.0";
const CLAUDE_TEST_MODEL = process.env.LIVE_CLAUDE_MODEL || CLAUDE_MODEL;

const RELEASE_ID = 34434571;
const LABEL_PHOTO = path.resolve("live/fixtures/zv-7-006-label.webp");

const describeWithClaude = ANTHROPIC_API_KEY ? describe : describe.skip;
const describeWithDiscogs = DISCOGS_TOKEN ? describe : describe.skip;
const describeWithBoth = ANTHROPIC_API_KEY && DISCOGS_TOKEN ? describe : describe.skip;

/** „ZV-7-006” = „zv 7 006”: porównujemy tylko litery i cyfry. */
const normalize = (value: string | null | undefined) =>
  (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

const claude = () => new Anthropic({ apiKey: ANTHROPIC_API_KEY, timeout: 60_000, maxRetries: 2 });

const discogs = () => new HttpDiscogsClient(DISCOGS_TOKEN, DISCOGS_USER_AGENT);

const labelImage = async () => ({
  data: await readFile(LABEL_PHOTO),
  mediaType: "image/webp" as const,
});

/** Integracje wprost z kluczy w `.env`, bez ustawień w bazie. */
const integrations: IntegrationProvider = {
  getLabelReader: async () =>
    ANTHROPIC_API_KEY ? new ClaudeLabelReader(claude(), CLAUDE_TEST_MODEL) : null,
  getConditionNoteTranslator: async () =>
    ANTHROPIC_API_KEY ? new ClaudeConditionNoteTranslator(claude(), CLAUDE_TEST_MODEL) : null,
  getDiscogs: async () => (DISCOGS_TOKEN ? discogs() : null),
};

/** Oczekujące zdjęcia trzymane w pamięci, a „baza” bez połączenia: testy nie potrzebują PostgreSQL. */
const pendingUploads: PendingUploadRepository & { rows: PendingUpload[] } = {
  rows: [],
  async create(_client, data) {
    this.rows.push({ ...data, createdAt: new Date() });
  },
  async claim() {
    return [];
  },
  async deleteExpired() {
    return [];
  },
};

const noDatabase: Database = {
  connect: async () =>
    ({ query: async () => ({ rows: [] }), release: () => undefined }) as unknown as PoolClient,
};

let storageDir: string;

beforeAll(async () => {
  storageDir = await mkdtemp(path.join(tmpdir(), "rasbass-live-"));
});

afterAll(async () => {
  await rm(storageDir, { recursive: true, force: true });
});

const lookupService = () =>
  new RecordLookupService(integrations, new LocalStorage(storageDir), pendingUploads, noDatabase);

describeWithClaude(`Claude (${CLAUDE_TEST_MODEL})`, () => {
  it("should read the catalog number, label and title from the label photo", async () => {
    const reader = new ClaudeLabelReader(claude(), CLAUDE_TEST_MODEL);

    const reading = await reader.read([await labelImage()]);

    expect(normalize(reading.catalogNumber)).toBe("zv7006");
    expect(normalize(reading.label)).toContain("zuluvibes");
    expect(normalize(reading.title)).toContain("jahprophecy");
    expect(reading.artists.map(normalize)).toContain("bunningtonjudah");
    expect([45, null]).toContain(reading.speed);
  });

  it("should translate a condition note from Polish to English and Spanish", async () => {
    const translation = await lookupService().translateConditionNote(
      "Lekkie trzaski na stronie B, okładka z przetarciem na rogu.",
    );

    expect(translation.pl).toBe("Lekkie trzaski na stronie B, okładka z przetarciem na rogu.");
    expect(translation.en?.length).toBeGreaterThan(10);
    expect(translation.es?.length).toBeGreaterThan(10);
    expect(translation.en).not.toBe(translation.pl);
    expect(translation.es).not.toBe(translation.en);
  });
});

describeWithDiscogs("Discogs", () => {
  it("should find the release by catalog number and label", async () => {
    const candidates = await lookupService().lookupByCatalogNumber("ZV-7-006", "Zulu Vibes");

    expect(candidates.map((candidate) => candidate.releaseId)).toContain(RELEASE_ID);
  });

  it("should map the release to a draft with both artists of the split", async () => {
    const draft = await lookupService().getReleaseDraft(RELEASE_ID);

    expect(draft).not.toBeNull();
    expect(draft!.product.attributes.artists.map(normalize)).toEqual(
      expect.arrayContaining(["bunningtonjudah", "zuluvibes"]),
    );
    expect(draft!.product.attributes.tracklist.length).toBeGreaterThanOrEqual(2);
    expect(draft!.variant.attributes).toEqual(
      expect.objectContaining({ format: '7"', label: "Zulu Vibes", discogsReleaseId: RELEASE_ID }),
    );
    // Discogs nie podaje prędkości dla tego wydania (w `formats` jest tylko 7"); jeśli kiedyś ją doda, ma być 45.
    expect([45, undefined]).toContain(draft!.variant.attributes.speed);
    expect(normalize(draft!.variant.attributes.catalogNumber)).toBe("zv7006");
  });

  it("should return null for a release that does not exist", async () => {
    expect(await lookupService().getReleaseDraft(999_999_999)).toBeNull();
  });
});

describeWithBoth("Label photo → Discogs (the wizard's first step)", () => {
  it("should read the photo, keep it and offer the right release", async () => {
    const result = await lookupService().lookupByPhoto([await labelImage()]);

    expect(result.candidates.map((candidate) => candidate.releaseId)).toContain(RELEASE_ID);
    expect(result.photoUploadIds).toHaveLength(1);

    const kept = pendingUploads.rows.find((row) => row.id === result.photoUploadIds[0]);
    expect(kept?.contentType).toBe("image/webp");
    expect(await new LocalStorage(storageDir).exists(kept!.path)).toBe(true);
  });
});

describe("NBP", () => {
  it("should return a plausible EUR/PLN rate", async () => {
    const store = new Map<string, number>();
    const cache: Cache<number> = {
      get: async (key) => store.get(key) ?? null,
      set: async (key, value) => {
        store.set(key, value);
      },
      delete: async (key) => {
        store.delete(key);
      },
      clear: async () => store.clear(),
      generation: async () => "live",
    };

    const rate = await new NbpExchangeRateProvider(cache, async () => null).getEurPlnRate();

    expect(rate).toBeGreaterThan(3.5);
    expect(rate).toBeLessThan(6);
  });
});
