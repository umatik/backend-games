import { describe, expect, it } from "@jest/globals";
import { z } from "zod";
import {
  createProductSchema,
  createProductVariantSchema,
  productListFiltersSchema,
  productStatusSchema,
  updateProductSchema,
  updateProductVariantSchema,
} from "@/validators/product.validator.js";
import { createOrderSchema } from "@/validators/order.validator.js";
import {
  forgotPasswordSchema,
  registerUserSchema,
  resetPasswordSchema,
  updateUserSchema,
} from "@/validators/user.validator.js";
import { formatZodIssues } from "@/validators/helpers/zod.js";

const UPLOAD_ID = "6f1c2c1e-6d2b-4d61-9a0e-3f4c5b6a7d8e";

describe("product validator", () => {
  it("should fill in defaults for a minimal draft", () => {
    expect(createProductSchema.parse({ type: "vinyl", title: "  Dub From Zion " })).toEqual({
      type: "vinyl",
      title: "Dub From Zion",
      attributes: {},
      variants: [],
    });
  });

  it("should default a variant to one copy", () => {
    expect(createProductVariantSchema.parse({ priceEur: 1500 })).toEqual({
      priceEur: 1500,
      quantity: 1,
      attributes: {},
    });
  });

  it.each([
    ["an unknown type", { type: "cassette", title: "A" }],
    ["a blank title", { type: "vinyl", title: "   " }],
    ["the old price field", { type: "vinyl", title: "A", price: 10 }],
    ["more than 100 variants", { type: "vinyl", title: "A", variants: Array(101).fill({ priceEur: 1 }) }],
  ])("should reject a product with %s", (_case, value) => {
    expect(createProductSchema.safeParse(value).success).toBe(false);
  });

  it.each([
    ["a price in euros instead of cents", { priceEur: 12.5 }],
    ["a negative price", { priceEur: -1 }],
    ["a price as text", { priceEur: "1500" }],
    ["a negative quantity", { priceEur: 1, quantity: -1 }],
    ["a photo id that is not a UUID", { priceEur: 1, photoUploadIds: ["photo-1"] }],
    ["more than two label photos", { priceEur: 1, photoUploadIds: [UPLOAD_ID, UPLOAD_ID, UPLOAD_ID] }],
  ])("should reject a variant with %s", (_case, value) => {
    expect(createProductVariantSchema.safeParse(value).success).toBe(false);
  });

  it("should accept up to two label photos", () => {
    expect(
      createProductVariantSchema.safeParse({ priceEur: 1, photoUploadIds: [UPLOAD_ID, UPLOAD_ID] })
        .success,
    ).toBe(true);
  });

  it("should require at least one field in updates", () => {
    expect(updateProductSchema.safeParse({}).success).toBe(false);
    expect(updateProductVariantSchema.safeParse({}).success).toBe(false);
    expect(updateProductSchema.safeParse({ description: null }).success).toBe(true);
    expect(updateProductVariantSchema.safeParse({ quantity: 0 }).success).toBe(true);
  });

  it("should not take variants or photos in updates", () => {
    expect(updateProductSchema.safeParse({ title: "A", variants: [] }).success).toBe(false);
    expect(
      updateProductVariantSchema.safeParse({ quantity: 1, photoUploadIds: [UPLOAD_ID] }).success,
    ).toBe(false);
  });

  it("should parse list filters from the query string", () => {
    expect(
      productListFiltersSchema.parse({
        artist: " zulu ",
        priceMinEur: "1000",
        priceMaxEur: "2500",
        available: "true",
        sort: "price_asc",
      }),
    ).toEqual({
      artist: "zulu",
      priceMinEur: 1000,
      priceMaxEur: 2500,
      available: true,
      sort: "price_asc",
    });

    expect(productListFiltersSchema.parse({})).toEqual({ sort: "newest" });
  });

  it.each([
    ["an unknown sort", { sort: "random" }],
    ["available other than true or false", { available: "yes" }],
    ["a fractional price", { priceMinEur: "10.5" }],
    ["an empty search", { q: "  " }],
  ])("should reject list filters with %s", (_case, value) => {
    expect(productListFiltersSchema.safeParse(value).success).toBe(false);
  });

  it("should show all products in the admin view by default", () => {
    expect(productStatusSchema.parse(undefined)).toBe("all");
    expect(productStatusSchema.safeParse("deleted").success).toBe(false);
  });
});

describe("order validator", () => {
  const item = { productVariantId: 1, quantity: 1 };

  it("should accept 1 to 100 items", () => {
    expect(createOrderSchema.safeParse({ items: [item] }).success).toBe(true);
    expect(createOrderSchema.safeParse({ items: [] }).success).toBe(false);
    expect(createOrderSchema.safeParse({ items: Array(101).fill(item) }).success).toBe(false);
  });

  it.each([
    ["zero quantity", { ...item, quantity: 0 }],
    ["fractional quantity", { ...item, quantity: 1.5 }],
    ["a non-positive variant id", { ...item, productVariantId: 0 }],
  ])("should reject an item with %s", (_case, value) => {
    expect(createOrderSchema.safeParse({ items: [value] }).success).toBe(false);
  });
});

describe("user validator", () => {
  const registration = {
    email: " Ras@Example.com ",
    password: "  spaced password  ",
    firstName: "Ras",
    lastName: "Bass",
    phone: "+48 600 000 000",
    address: "Dubowa 7",
    city: "Kraków",
    postalCode: "30-001",
    country: "Poland",
  };

  it("should trim the email but keep the password as typed", () => {
    const parsed = registerUserSchema.parse(registration);

    expect(parsed.email).toBe("Ras@Example.com");
    expect(parsed.password).toBe("  spaced password  ");
  });

  it.each([
    ["a password shorter than 8 characters", { password: "short" }],
    ["a password made of spaces", { password: "         " }],
    ["an invalid email", { email: "ras.example.com" }],
    ["a missing city", { city: undefined }],
  ])("should reject a registration with %s", (_case, change) => {
    expect(registerUserSchema.safeParse({ ...registration, ...change }).success).toBe(false);
  });

  it("should lowercase the email of a reset request", () => {
    expect(forgotPasswordSchema.parse({ email: " Ras@Example.COM " })).toEqual({
      email: "ras@example.com",
    });
  });

  it("should require a token and a valid new password", () => {
    expect(resetPasswordSchema.safeParse({ token: "abc", password: "new-password" }).success).toBe(
      true,
    );
    expect(resetPasswordSchema.safeParse({ token: " ", password: "new-password" }).success).toBe(
      false,
    );
  });

  it("should accept only known fields and at least one of them in a user update", () => {
    expect(updateUserSchema.safeParse({ city: "Valencia" }).success).toBe(true);
    expect(updateUserSchema.safeParse({}).success).toBe(false);
    expect(updateUserSchema.safeParse({ role: "admin" }).success).toBe(false);
  });
});

describe("formatZodIssues", () => {
  it("should join nested paths with dots", () => {
    const result = z
      .object({ variants: z.array(z.object({ priceEur: z.int() })) })
      .safeParse({ variants: [{ priceEur: 1 }, { priceEur: "x" }] });

    expect(result.success).toBe(false);
    expect(formatZodIssues(result.error!)).toEqual([
      { path: "variants.1.priceEur", message: expect.any(String) },
    ]);
  });
});
