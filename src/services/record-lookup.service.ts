import type {
  DiscogsClient,
  DiscogsRelease,
  DiscogsSearchParams,
  DiscogsSearchResult,
} from "@/integrations/discogs/discogs-client.js";
import type {
  LabelImage,
  LabelReader,
  LabelReading,
} from "@/integrations/claude/label-reader.js";
import type { ConditionNoteTranslator } from "@/integrations/claude/condition-note-translator.js";
import { IntegrationNotConfiguredError } from "@/errors/external-service.error.js";
import type { TranslatedText } from "@/product-types/common.js";
import { VINYL_FORMATS } from "@/product-types/vinyl.js";

/** Kandydat z Discogs na liście do wyboru w kreatorze. */
export type ReleaseCandidate = {
  releaseId: number;
  title: string | null;
  thumbnail: string | null;
  label: string | null;
  catalogNumber: string | null;
  year: number | null;
  country: string | null;
  formats: string[];
};

/**
 * Propozycja danych do formularza kreatora. Pola są tylko podpowiedzią: stan, cenę i ilość wpisuje człowiek,
 * a całość przechodzi zwykłą walidację przy zapisie.
 */
export type ReleaseDraft = {
  product: {
    type: "vinyl";
    title: string;
    description: string | null;
    attributes: {
      artists: string[];
      tracklist: { position?: string; title: string; artists?: string[]; duration?: string }[];
      previewLinks: string[];
    };
  };
  variant: {
    attributes: {
      format?: (typeof VINYL_FORMATS)[number];
      speed?: 33 | 45;
      year?: number;
      label?: string;
      catalogNumber?: string;
      country?: string;
      pressing?: "reissue";
      discogsReleaseId: number;
    };
  };
};

const CANDIDATE_LIMIT = 10;
const MAX_PREVIEW_LINKS = 20;
const MAX_DESCRIPTION_LENGTH = 10_000;

/** Discogs dokleja do nazw numer dla odróżnienia osób o tym samym imieniu, np. „Zulu Vibes (2)”. */
const cleanName = (name: string): string => name.replace(/\s+\(\d+\)$/, "").trim();

const emptyToUndefined = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

export class RecordLookupService {
  constructor(
    private readonly labelReader: LabelReader | null,
    private readonly discogs: DiscogsClient | null,
    private readonly translator: ConditionNoteTranslator | null,
  ) {}

  /**
   * Zdjęcie labela → odczyt przez Claude → kandydaci z Discogs. Zwraca też sam odczyt, żeby opcja
   * „żadne z nich, wpisz ręcznie” mogła uzupełnić formularz tym, co AI zobaczyło.
   */
  async lookupByPhoto(
    images: LabelImage[],
  ): Promise<{ reading: LabelReading; candidates: ReleaseCandidate[] }> {
    const labelReader = this.require(this.labelReader, "Claude");
    const discogs = this.require(this.discogs, "Discogs");

    const reading = await labelReader.read(images);
    const candidates = await this.searchWithFallback(discogs, {
      catno: reading.catalogNumber ?? undefined,
      label: reading.label ?? undefined,
      artist: reading.artists[0],
      releaseTitle: reading.title ?? undefined,
    });

    return { reading, candidates };
  }

  /** Wyszukiwanie po wpisanym numerze katalogowym (opcjonalnie z wytwórnią), bez zdjęcia. */
  async lookupByCatalogNumber(
    catalogNumber: string,
    label?: string,
  ): Promise<ReleaseCandidate[]> {
    const discogs = this.require(this.discogs, "Discogs");

    return this.searchWithFallback(discogs, { catno: catalogNumber, label });
  }

  async getReleaseDraft(releaseId: number): Promise<ReleaseDraft | null> {
    const discogs = this.require(this.discogs, "Discogs");
    const release = await discogs.getRelease(releaseId);

    return release ? mapReleaseToDraft(release) : null;
  }

  async translateConditionNote(polishText: string): Promise<TranslatedText> {
    const translator = this.require(this.translator, "Claude");
    const { en, es } = await translator.translate(polishText);

    return { en, es, pl: polishText };
  }

  /**
   * Najpewniejszy jest numer katalogowy z wytwórnią; potem sam numer; na końcu artysta z tytułem.
   * Kolejny krok uruchamia się tylko, gdy poprzedni nic nie znalazł.
   */
  private async searchWithFallback(
    discogs: DiscogsClient,
    params: DiscogsSearchParams,
  ): Promise<ReleaseCandidate[]> {
    const attempts: DiscogsSearchParams[] = [];

    if (params.catno) {
      if (params.label) {
        attempts.push({ catno: params.catno, label: params.label });
      }

      attempts.push({ catno: params.catno });
    }

    if (params.artist || params.releaseTitle) {
      attempts.push({ artist: params.artist, releaseTitle: params.releaseTitle });
    }

    for (const attempt of attempts) {
      const results = await discogs.search(attempt, CANDIDATE_LIMIT);

      if (results.length > 0) {
        return results.map(mapSearchResult);
      }
    }

    return [];
  }

  private require<T>(dependency: T | null, service: string): T {
    if (dependency === null) {
      throw new IntegrationNotConfiguredError(service);
    }

    return dependency;
  }
}

export const mapSearchResult = (result: DiscogsSearchResult): ReleaseCandidate => {
  const year = Number(result.year);

  return {
    releaseId: result.id,
    title: result.title ?? null,
    thumbnail: result.thumb || result.cover_image || null,
    label: result.label?.[0] ? cleanName(result.label[0]) : null,
    catalogNumber: emptyToUndefined(result.catno) ?? null,
    year: Number.isInteger(year) && year > 0 ? year : null,
    country: result.country ?? null,
    formats: result.format ?? [],
  };
};

export const mapReleaseToDraft = (release: DiscogsRelease): ReleaseDraft => {
  const descriptions = (release.formats ?? []).flatMap(
    (format) => format.descriptions ?? [],
  );

  const format = descriptions.includes("LP")
    ? "LP"
    : VINYL_FORMATS.find((size) => size !== "LP" && descriptions.includes(size));

  const speedText = descriptions.find((description) => /RPM/i.test(description));
  const speed = speedText?.startsWith("45")
    ? 45
    : speedText?.startsWith("33")
      ? 33
      : undefined;

  const firstLabel = release.labels?.[0];
  const catalogNumber = emptyToUndefined(firstLabel?.catno);

  const credits = (release.extraartists ?? [])
    .filter((artist) => artist.role)
    .map((artist) => `${artist.role} – ${cleanName(artist.name)}`);

  const description = [emptyToUndefined(release.notes), credits.join("\n") || undefined]
    .filter((part): part is string => part !== undefined)
    .join("\n\n")
    .slice(0, MAX_DESCRIPTION_LENGTH);

  const artists = (release.artists ?? []).map((artist) => cleanName(artist.name));

  return {
    product: {
      type: "vinyl",
      title: release.title?.trim() || "Untitled",
      description: description || null,
      attributes: {
        artists: artists.length > 0 ? artists : ["Unknown Artist"],
        tracklist: (release.tracklist ?? [])
          .filter((track) => (track.type_ ?? "track") === "track" && track.title)
          .map((track) => ({
            ...(emptyToUndefined(track.position) && { position: track.position!.trim() }),
            title: track.title!.trim(),
            ...(track.artists?.length && {
              artists: track.artists.map((artist) => cleanName(artist.name)),
            }),
            ...(emptyToUndefined(track.duration) && { duration: track.duration!.trim() }),
          })),
        previewLinks: (release.videos ?? [])
          .map((video) => video.uri)
          .filter((uri) => /^https?:\/\//.test(uri))
          .slice(0, MAX_PREVIEW_LINKS),
      },
    },
    variant: {
      attributes: {
        ...(format && { format }),
        ...(speed && { speed }),
        ...(release.year && release.year > 0 && { year: release.year }),
        ...(firstLabel && { label: cleanName(firstLabel.name) }),
        ...(catalogNumber && catalogNumber.toLowerCase() !== "none" && { catalogNumber }),
        ...(emptyToUndefined(release.country) && { country: release.country!.trim() }),
        ...(descriptions.includes("Reissue") && { pressing: "reissue" as const }),
        discogsReleaseId: release.id,
      },
    },
  };
};
