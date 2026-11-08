import { toLoggableError } from "@/errors/loggable-error.js";
import type {
  DiscogsClient,
  DiscogsRelease,
  DiscogsSearchParams,
  DiscogsSearchResult,
} from "@/integrations/discogs/discogs-client.js";
import type { LabelImage, LabelReading } from "@/integrations/claude/label-reader.js";
import type { IntegrationProvider } from "@/integrations/integration-provider.js";
import { randomUUID } from "node:crypto";
import {
  IntegrationNotConfiguredError,
  PhotoLookupError,
} from "@/errors/external-service.error.js";
import type { Database } from "@/database/database.interface.js";
import type { Storage } from "@/storage/storage.interface.js";
import {
  PENDING_UPLOAD_TTL_MS,
  type PendingUploadRepository,
} from "@/repositories/pending-upload/pending-upload.interface.js";
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

const EXTENSION_BY_MEDIA_TYPE: Record<LabelImage["mediaType"], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_PREVIEW_LINKS = 20;
const MAX_DESCRIPTION_LENGTH = 10_000;

/** Discogs zwraca ten pusty obrazek zamiast miniatury, gdy nie udostępnia okładki. */
const isPlaceholderImage = (url: string | undefined): boolean =>
  !url || url.endsWith("/spacer.gif");

/** Discogs dokleja do nazw numer dla odróżnienia osób o tym samym imieniu, np. „Zulu Vibes (2)”. */
const cleanName = (name: string): string => name.replace(/\s+\(\d+\)$/, "").trim();

const emptyToUndefined = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

export class RecordLookupService {
  constructor(
    private readonly integrations: IntegrationProvider,
    private readonly storage: Storage,
    private readonly pendingUploads: PendingUploadRepository,
    private readonly pool: Database,
  ) {}

  /**
   * Zdjęcie labela → odczyt przez Claude → kandydaci z Discogs. Zwraca też sam odczyt, żeby opcja
   * „żadne z nich, wpisz ręcznie” mogła uzupełnić formularz tym, co AI zobaczyło, oraz `photoUploadIds`:
   * zapisane zdjęcia, które przy tworzeniu wariantu stają się jego zdjęciami (pierwsze jako główne).
   */
  async lookupByPhoto(
    images: LabelImage[],
    userId: number | null = null,
  ): Promise<{
    reading: LabelReading;
    candidates: ReleaseCandidate[];
    photoUploadIds: string[];
  }> {
    // Zdjęcia zapisujemy najpierw: gdy Claude albo Discogs zawiodą, kreator przejdzie do formularza ręcznego
    // i nadal podepnie to zdjęcie do wariantu.
    const photoUploadIds = await this.savePendingPhotos(images, userId);

    try {
      const labelReader = this.require(await this.integrations.getLabelReader(), "Claude");
      const discogs = this.require(await this.integrations.getDiscogs(), "Discogs");

      const reading = await labelReader.read(images);
      const candidates = await this.searchWithFallback(discogs, {
        catno: reading.catalogNumber ?? undefined,
        label: reading.label ?? undefined,
        artist: reading.artists[0],
        releaseTitle: reading.title ?? undefined,
      });

      return { reading, candidates, photoUploadIds };
    } catch (error) {
      console.error("Label lookup failed, photos kept for manual entry:", toLoggableError(error));
      throw new PhotoLookupError(error, photoUploadIds);
    }
  }

  /** Wyszukiwanie po wpisanym numerze katalogowym (opcjonalnie z wytwórnią), bez zdjęcia. */
  async lookupByCatalogNumber(
    catalogNumber: string,
    label?: string,
  ): Promise<ReleaseCandidate[]> {
    const discogs = this.require(await this.integrations.getDiscogs(), "Discogs");

    return this.searchWithFallback(discogs, { catno: catalogNumber, label });
  }

  async getReleaseDraft(releaseId: number): Promise<ReleaseDraft | null> {
    const discogs = this.require(await this.integrations.getDiscogs(), "Discogs");
    const release = await discogs.getRelease(releaseId);

    return release ? mapReleaseToDraft(release) : null;
  }

  async translateConditionNote(polishText: string): Promise<TranslatedText> {
    const translator = this.require(
      await this.integrations.getConditionNoteTranslator(),
      "Claude",
    );
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

  /** Zapisuje zdjęcia w docelowym folderze i rejestruje je jako oczekujące; przy okazji sprząta stare. */
  private async savePendingPhotos(
    images: LabelImage[],
    userId: number | null,
  ): Promise<string[]> {
    const client = await this.pool.connect();
    const saved: string[] = [];

    try {
      const expired = await this.pendingUploads.deleteExpired(
        client,
        new Date(Date.now() - PENDING_UPLOAD_TTL_MS),
      );

      for (const upload of expired) {
        await this.storage.delete(upload.path).catch((error: unknown) => {
          console.error(`Failed to delete expired upload "${upload.path}":`, error);
        });
      }

      const ids: string[] = [];

      for (const image of images) {
        const id = randomUUID();
        const path = await this.storage.save(
          image.data,
          `products/photo/label-${id}.${EXTENSION_BY_MEDIA_TYPE[image.mediaType]}`,
          image.mediaType,
        );

        saved.push(path);
        await this.pendingUploads.create(client, {
          id,
          path,
          contentType: image.mediaType,
          createdBy: userId,
        });
        ids.push(id);
      }

      return ids;
    } catch (error) {
      for (const path of saved) {
        await this.storage.delete(path).catch(() => undefined);
      }

      throw error;
    } finally {
      client.release();
    }
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
    thumbnail:
      [result.thumb, result.cover_image].find((url) => !isPlaceholderImage(url)) ?? null,
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

  // Przy splitach Discogs często podaje na poziomie wydania tylko jednego artystę, a resztę przy utworach
  // (np. dub innego wykonawcy na stronie B), więc dołączamy też artystów z listy utworów.
  const artists = [
    ...new Set(
      [
        ...(release.artists ?? []),
        ...(release.tracklist ?? []).flatMap((track) => track.artists ?? []),
      ].map((artist) => cleanName(artist.name)),
    ),
  ];

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
