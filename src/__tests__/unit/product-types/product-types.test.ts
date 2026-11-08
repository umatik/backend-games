import { describe, expect, it } from "@jest/globals";
import {
  getProductType,
  isProductTypeKey,
  productTypes,
} from "@/product-types/index.js";
import { GOLDMINE_GRADES, vinylType } from "@/product-types/vinyl.js";
import { tshirtType } from "@/product-types/tshirt.js";
import { otherType } from "@/product-types/other.js";
import type { ProductDetails } from "@/types/product.types.js";

const vinylVariant = {
  format: "LP",
  mediaCondition: "VG+",
  sleeveCondition: "VG",
};

describe("product type registry", () => {
  it("should know vinyl, tshirt and other", () => {
    expect(productTypes.map((type) => type.key)).toEqual(["vinyl", "tshirt", "other"]);
    expect(getProductType("vinyl")).toBe(vinylType);
    expect(isProductTypeKey("tshirt")).toBe(true);
  });

  it("should not know other keys", () => {
    expect(getProductType("cassette")).toBeUndefined();
    expect(isProductTypeKey("toString")).toBe(false);
    expect(isProductTypeKey("")).toBe(false);
  });
});

describe("vinyl product attributes", () => {
  const parse = (value: unknown) => vinylType.productAttributes.safeParse(value);

  it("should default the tracklist and preview links to empty lists", () => {
    expect(parse({ artists: ["Zulu Vibes"] }).data).toEqual({
      artists: ["Zulu Vibes"],
      tracklist: [],
      previewLinks: [],
    });
  });

  it("should trim artists and accept several for a split", () => {
    expect(parse({ artists: [" Bunnington Judah ", "Zulu Vibes"] }).data?.artists).toEqual([
      "Bunnington Judah",
      "Zulu Vibes",
    ]);
  });

  it.each([
    ["no artists", {}],
    ["an empty artist list", { artists: [] }],
    ["a blank artist", { artists: ["   "] }],
    ["an unknown field", { artists: ["A"], genre: "reggae" }],
    ["a track without a title", { artists: ["A"], tracklist: [{ position: "A1" }] }],
  ])("should reject %s", (_case, value) => {
    expect(parse(value).success).toBe(false);
  });

  it("should accept only http and https preview links", () => {
    expect(parse({ artists: ["A"], previewLinks: ["https://youtu.be/abc"] }).success).toBe(true);

    for (const link of ["javascript:alert(1)", "ftp://example.com/a.mp3", "not a url"]) {
      expect(parse({ artists: ["A"], previewLinks: [link] }).success).toBe(false);
    }
  });
});

describe("vinyl variant attributes", () => {
  const parse = (value: unknown) => vinylType.variantAttributes.safeParse(value);

  it("should accept every Goldmine grade for the record and the sleeve", () => {
    for (const grade of GOLDMINE_GRADES) {
      expect(parse({ ...vinylVariant, mediaCondition: grade, sleeveCondition: grade }).success).toBe(
        true,
      );
    }
  });

  it("should allow a generic or missing sleeve, but not for the record itself", () => {
    expect(parse({ ...vinylVariant, sleeveCondition: "generic" }).success).toBe(true);
    expect(parse({ ...vinylVariant, sleeveCondition: "no_cover" }).success).toBe(true);
    expect(parse({ ...vinylVariant, mediaCondition: "generic" }).success).toBe(false);
  });

  it("should accept the full pressing description", () => {
    const pressing = {
      ...vinylVariant,
      format: '7"',
      speed: 45,
      year: 1982,
      label: "Zulu Vibes",
      catalogNumber: "ZV-7-006",
      country: "UK",
      pressing: "original",
      conditionNote: { pl: "lekki trzask na B2", en: "light crackle on B2" },
      discogsReleaseId: 34434571,
    };

    expect(parse(pressing).data).toEqual(pressing);
  });

  it.each([
    ["an unknown format", { format: "CD" }],
    ["78 RPM", { speed: 78 }],
    ["a year before 1900", { year: 1899 }],
    ["a fractional year", { year: 1982.5 }],
    ["an unknown pressing kind", { pressing: "bootleg" }],
    ["a condition note without any language", { conditionNote: {} }],
    ["a condition note in an unsupported language", { conditionNote: { de: "Knistern" } }],
    ["a non-positive Discogs release id", { discogsReleaseId: 0 }],
    ["an unknown field", { color: "red" }],
  ])("should reject %s", (_case, change) => {
    expect(parse({ ...vinylVariant, ...change }).success).toBe(false);
  });

  it("should require the format and both conditions", () => {
    expect(parse({ format: "LP", mediaCondition: "NM" }).success).toBe(false);
    expect(parse({ mediaCondition: "NM", sleeveCondition: "NM" }).success).toBe(false);
  });
});

describe("vinyl warnings and slug", () => {
  const product = (previewLinks: string[], mediaTypes: string[] = []) =>
    ({
      attributes: { artists: ["A"], previewLinks },
      variants: [{ media: mediaTypes.map((type) => ({ type })) }],
    }) as unknown as ProductDetails;

  it("should warn about a missing preview", () => {
    expect(vinylType.warnings(product([]))).toEqual(["missing_preview"]);
    expect(vinylType.warnings(product([], ["photo"]))).toEqual(["missing_preview"]);
  });

  it("should not warn when there is a preview link or an audio recording", () => {
    expect(vinylType.warnings(product(["https://youtu.be/abc"]))).toEqual([]);
    expect(vinylType.warnings(product([], ["audio"]))).toEqual([]);
  });

  it("should build the slug from the artists", () => {
    expect(vinylType.slugParts({ artists: ["Bunnington Judah", "Zulu Vibes"] })).toEqual([
      "Bunnington Judah",
      "Zulu Vibes",
    ]);
  });
});

describe("tshirt and other attributes", () => {
  it("should require the color and size of a t-shirt", () => {
    expect(tshirtType.variantAttributes.safeParse({ color: "red", size: "M" }).success).toBe(true);
    expect(tshirtType.variantAttributes.safeParse({ color: "red" }).success).toBe(false);
    expect(tshirtType.variantAttributes.safeParse({ color: " ", size: "M" }).success).toBe(false);
  });

  it("should not accept product attributes for types without them", () => {
    expect(tshirtType.productAttributes.safeParse({}).success).toBe(true);
    expect(tshirtType.productAttributes.safeParse({ artists: ["A"] }).success).toBe(false);
    expect(otherType.productAttributes.safeParse({ material: "brass" }).success).toBe(false);
  });

  it("should take optional details for other products, up to 500 characters", () => {
    expect(otherType.variantAttributes.safeParse({}).success).toBe(true);
    expect(otherType.variantAttributes.safeParse({ details: "mosiądz, 12 cm" }).success).toBe(true);
    expect(otherType.variantAttributes.safeParse({ details: "x".repeat(501) }).success).toBe(false);
  });
});
