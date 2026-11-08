import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import {
  mapReleaseToDraft,
  mapSearchResult,
  RecordLookupService,
} from "@/services/record-lookup.service.js";
import type {
  DiscogsClient,
  DiscogsRelease,
  DiscogsSearchResult,
} from "@/integrations/discogs/discogs-client.js";
import type { LabelReader, LabelReading } from "@/integrations/claude/label-reader.js";
import type { ConditionNoteTranslator } from "@/integrations/claude/condition-note-translator.js";
import {
  ExternalServiceError,
  IntegrationNotConfiguredError,
  PhotoLookupError,
} from "@/errors/external-service.error.js";
import { getProductType } from "@/product-types/index.js";
import type { IntegrationProvider } from "@/integrations/integration-provider.js";
import type { Storage } from "@/storage/storage.interface.js";
import type { PendingUploadRepository } from "@/repositories/pending-upload/pending-upload.interface.js";
import type { Database } from "@/database/database.interface.js";
import type { PoolClient } from "pg";

const storage = {
  save: jest.fn<Storage["save"]>(async (_file, filename) => filename),
  delete: jest.fn<Storage["delete"]>(async () => undefined),
  exists: jest.fn<Storage["exists"]>(),
};

const pendingUploads = {
  create: jest.fn<PendingUploadRepository["create"]>(async () => undefined),
  claim: jest.fn<PendingUploadRepository["claim"]>(),
  deleteExpired: jest.fn<PendingUploadRepository["deleteExpired"]>(async () => []),
};

const releaseClient = jest.fn();
const pool: Database = {
  connect: async () => ({ release: releaseClient }) as unknown as PoolClient,
};

const lookupService = (provider: IntegrationProvider) =>
  new RecordLookupService(provider, storage, pendingUploads, pool);

const providerOf = (integrations: {
  labelReader?: LabelReader;
  discogs?: DiscogsClient;
  translator?: ConditionNoteTranslator;
}): IntegrationProvider => ({
  getLabelReader: async () => integrations.labelReader ?? null,
  getDiscogs: async () => integrations.discogs ?? null,
  getConditionNoteTranslator: async () => integrations.translator ?? null,
});

const zuluReading: LabelReading = {
  artists: ["Bunnington Judah", "Zulu Vibes"],
  title: "Jah Prophecy",
  label: "Zulu Vibes",
  catalogNumber: "ZV-7-006",
  year: null,
  format: '7"',
  speed: 45,
  sides: [
    { side: "A", title: "Jah Prophecy", artists: ["Bunnington Judah"] },
    { side: "B", title: "Prophetic Dub", artists: ["Zulu Vibes"] },
  ],
};

const zuluSearchResult: DiscogsSearchResult = {
  id: 123,
  title: "Bunnington Judah / Zulu Vibes - Jah Prophecy",
  thumb: "https://img.example/thumb.jpg",
  year: "2025",
  country: "France",
  catno: "ZV-7-006",
  label: ["Zulu Vibes (2)"],
  format: ["Vinyl", '7"', "45 RPM"],
};

const zuluRelease: DiscogsRelease = {
  id: 123,
  title: "Jah Prophecy",
  year: 2025,
  country: "France",
  notes: "Limited pressing.",
  artists: [
    { name: "Bunnington Judah", join: "/" },
    { name: "Zulu Vibes (2)" },
  ],
  extraartists: [
    { name: "Macca Dread", role: "Keyboards, Guitar" },
    { name: "Downbeat Records", role: "Mastered By" },
  ],
  labels: [{ name: "Zulu Vibes (2)", catno: "ZV-7-006" }],
  formats: [{ name: "Vinyl", qty: "1", descriptions: ['7"', "45 RPM", "Single"] }],
  tracklist: [
    { position: "A", title: "Jah Prophecy", duration: "", type_: "track" },
    { position: "", title: "Heading", type_: "heading" },
    {
      position: "B",
      title: "Prophetic Dub",
      duration: "3:45",
      type_: "track",
      artists: [{ name: "Zulu Vibes (2)" }],
    },
  ],
  videos: [
    { uri: "https://www.youtube.com/watch?v=abc", title: "Jah Prophecy" },
    { uri: "javascript:alert(1)" },
  ],
};

describe("RecordLookupService", () => {
  let labelReader: jest.Mocked<LabelReader>;
  let discogs: jest.Mocked<DiscogsClient>;
  let translator: jest.Mocked<ConditionNoteTranslator>;
  let service: RecordLookupService;

  beforeEach(() => {
    labelReader = { read: jest.fn<LabelReader["read"]>().mockResolvedValue(zuluReading) };
    discogs = {
      search: jest.fn<DiscogsClient["search"]>().mockResolvedValue([]),
      getRelease: jest.fn<DiscogsClient["getRelease"]>(),
    };
    translator = { translate: jest.fn<ConditionNoteTranslator["translate"]>() };
    jest.clearAllMocks();
    service = lookupService(providerOf({ labelReader, discogs, translator }));
  });

  describe("lookupByPhoto", () => {
    it("should search by catalog number and label first and return the reading", async () => {
      discogs.search.mockResolvedValueOnce([zuluSearchResult]);
      const image = { data: Buffer.from("jpg"), mediaType: "image/jpeg" as const };

      const result = await service.lookupByPhoto([image]);

      expect(labelReader.read).toHaveBeenCalledWith([image]);
      expect(discogs.search).toHaveBeenCalledTimes(1);
      expect(discogs.search).toHaveBeenCalledWith(
        { catno: "ZV-7-006", label: "Zulu Vibes" },
        10,
      );
      expect(result.reading).toBe(zuluReading);
      expect(result.candidates).toEqual([mapSearchResult(zuluSearchResult)]);
    });

    it("should keep the label photos for the variant and clean up old ones", async () => {
      pendingUploads.deleteExpired.mockResolvedValueOnce([
        {
          id: "old",
          path: "products/photo/label-old.jpg",
          contentType: "image/jpeg",
          createdBy: null,
          createdAt: new Date(0),
        },
      ]);

      const result = await service.lookupByPhoto(
        [
          { data: Buffer.from("a"), mediaType: "image/jpeg" },
          { data: Buffer.from("b"), mediaType: "image/webp" },
        ],
        2,
      );

      expect(storage.delete).toHaveBeenCalledWith("products/photo/label-old.jpg");
      expect(result.photoUploadIds).toHaveLength(2);
      expect(storage.save.mock.calls.map((call) => call[1])).toEqual([
        `products/photo/label-${result.photoUploadIds[0]}.jpg`,
        `products/photo/label-${result.photoUploadIds[1]}.webp`,
      ]);
      expect(pendingUploads.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ id: result.photoUploadIds[0], createdBy: 2 }),
      );
      expect(releaseClient).toHaveBeenCalled();
    });

    it("should keep the photos and return their ids when the lookup fails", async () => {
      labelReader.read.mockRejectedValue(new ExternalServiceError("Claude declined to read the label"));
      jest.spyOn(console, "error").mockImplementation(() => {});

      const error = await service
        .lookupByPhoto([{ data: Buffer.from("a"), mediaType: "image/jpeg" }], 2)
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(PhotoLookupError);
      expect((error as PhotoLookupError).statusCode).toBe(502);
      expect((error as PhotoLookupError).message).toBe("Claude declined to read the label");
      expect((error as PhotoLookupError).photoUploadIds).toHaveLength(1);
      expect(storage.save).toHaveBeenCalledTimes(1);
      expect(pendingUploads.create).toHaveBeenCalledTimes(1);
    });

    it("should keep the photos when Claude is not configured", async () => {
      jest.spyOn(console, "error").mockImplementation(() => {});

      const error = await lookupService(providerOf({}))
        .lookupByPhoto([{ data: Buffer.from("a"), mediaType: "image/jpeg" }])
        .catch((caught: unknown) => caught);

      expect((error as PhotoLookupError).statusCode).toBe(503);
      expect((error as PhotoLookupError).photoUploadIds).toHaveLength(1);
    });

    it("should fall back to the catalog number alone, then to artist and title", async () => {
      await service.lookupByPhoto([{ data: Buffer.from("x"), mediaType: "image/png" }]);

      expect(discogs.search.mock.calls.map((call) => call[0])).toEqual([
        { catno: "ZV-7-006", label: "Zulu Vibes" },
        { catno: "ZV-7-006" },
        { artist: "Bunnington Judah", releaseTitle: "Jah Prophecy" },
      ]);
    });

    it("should return no candidates when nothing could be read", async () => {
      labelReader.read.mockResolvedValue({
        ...zuluReading,
        artists: [],
        title: null,
        label: null,
        catalogNumber: null,
      });

      const result = await service.lookupByPhoto([
        { data: Buffer.from("x"), mediaType: "image/png" },
      ]);

      expect(discogs.search).not.toHaveBeenCalled();
      expect(result.candidates).toEqual([]);
    });
  });

  it("should search by a typed catalog number", async () => {
    discogs.search.mockResolvedValueOnce([zuluSearchResult]);

    const candidates = await service.lookupByCatalogNumber("ZV-7-006");

    expect(discogs.search).toHaveBeenCalledWith({ catno: "ZV-7-006" }, 10);
    expect(candidates).toHaveLength(1);
  });

  it("should return null for a release Discogs does not know", async () => {
    discogs.getRelease.mockResolvedValue(null);

    expect(await service.getReleaseDraft(999)).toBeNull();
  });

  it("should keep the Polish condition note and add the translations", async () => {
    translator.translate.mockResolvedValue({
      en: "Light crackle on side B",
      es: "Ligero crujido en la cara B",
    });

    expect(await service.translateConditionNote("Lekki trzask na stronie B")).toEqual({
      pl: "Lekki trzask na stronie B",
      en: "Light crackle on side B",
      es: "Ligero crujido en la cara B",
    });
  });

  it.each([
    ["Claude", () => lookupService(providerOf({})).lookupByPhoto([])],
    ["Discogs", () => lookupService(providerOf({})).lookupByCatalogNumber("X")],
    ["Discogs", () => lookupService(providerOf({})).getReleaseDraft(1)],
    ["Claude", () => lookupService(providerOf({})).translateConditionNote("x")],
  ])("should report that %s is not configured", async (service, call) => {
    jest.spyOn(console, "error").mockImplementation(() => {});

    // Przy zdjęciu błąd jest opakowany w PhotoLookupError (z zapisanymi zdjęciami), ale komunikat jest ten sam.
    await expect(call()).rejects.toThrow(new IntegrationNotConfiguredError(service).message);
  });
});

describe("mapSearchResult", () => {
  it("should map a Discogs search result to a candidate", () => {
    expect(mapSearchResult(zuluSearchResult)).toEqual({
      releaseId: 123,
      title: "Bunnington Judah / Zulu Vibes - Jah Prophecy",
      thumbnail: "https://img.example/thumb.jpg",
      label: "Zulu Vibes",
      catalogNumber: "ZV-7-006",
      year: 2025,
      country: "France",
      formats: ["Vinyl", '7"', "45 RPM"],
    });
  });

  it("should skip the Discogs placeholder image", () => {
    expect(
      mapSearchResult({
        id: 1,
        thumb: "https://st.discogs.com/abc/images/spacer.gif",
        cover_image: "https://i.discogs.com/cover.jpg",
      }).thumbnail,
    ).toBe("https://i.discogs.com/cover.jpg");
    expect(
      mapSearchResult({ id: 1, thumb: "https://st.discogs.com/abc/images/spacer.gif" }).thumbnail,
    ).toBeNull();
  });

  it("should use nulls for missing fields", () => {
    expect(mapSearchResult({ id: 1, year: "0" })).toEqual({
      releaseId: 1,
      title: null,
      thumbnail: null,
      label: null,
      catalogNumber: null,
      year: null,
      country: null,
      formats: [],
    });
  });
});

describe("mapReleaseToDraft", () => {
  it("should map a Discogs release to the product form", () => {
    const draft = mapReleaseToDraft(zuluRelease);

    expect(draft.product).toEqual({
      type: "vinyl",
      title: "Jah Prophecy",
      description:
        "Limited pressing.\n\nKeyboards, Guitar – Macca Dread\nMastered By – Downbeat Records",
      attributes: {
        artists: ["Bunnington Judah", "Zulu Vibes"],
        tracklist: [
          { position: "A", title: "Jah Prophecy" },
          { position: "B", title: "Prophetic Dub", artists: ["Zulu Vibes"], duration: "3:45" },
        ],
        previewLinks: ["https://www.youtube.com/watch?v=abc"],
      },
    });
    expect(draft.variant.attributes).toEqual({
      format: '7"',
      speed: 45,
      year: 2025,
      label: "Zulu Vibes",
      catalogNumber: "ZV-7-006",
      country: "France",
      discogsReleaseId: 123,
    });
  });

  it("should add artists credited only on tracks, as on splits", () => {
    const draft = mapReleaseToDraft({
      id: 34434571,
      title: "Jah Prophecy",
      artists: [{ name: "Bunnington Judah" }],
      tracklist: [
        { position: "A", title: "Jah Prophecy", artists: [{ name: "Bunnington Judah" }] },
        { position: "B", title: "Prophetic Dub", artists: [{ name: "Zulu Vibes" }] },
      ],
    });

    expect(draft.product.attributes.artists).toEqual(["Bunnington Judah", "Zulu Vibes"]);
  });

  it("should produce product attributes that pass the vinyl schema", () => {
    const vinyl = getProductType("vinyl")!;

    expect(
      vinyl.productAttributes.safeParse(mapReleaseToDraft(zuluRelease).product.attributes)
        .success,
    ).toBe(true);
  });

  it("should detect an LP reissue at 33 RPM and skip a catalog number of 'none'", () => {
    const draft = mapReleaseToDraft({
      id: 5,
      title: "Dub From Zion",
      formats: [{ name: "Vinyl", descriptions: ["LP", "Album", "Reissue", "33 ⅓ RPM"] }],
      labels: [{ name: "Lion Yard", catno: "none" }],
    });

    expect(draft.variant.attributes).toEqual({
      format: "LP",
      speed: 33,
      label: "Lion Yard",
      pressing: "reissue",
      discogsReleaseId: 5,
    });
    expect(draft.product.attributes.artists).toEqual(["Unknown Artist"]);
    expect(draft.product.description).toBeNull();
  });
});
