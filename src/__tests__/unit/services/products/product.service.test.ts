import { beforeEach, describe, jest, it, expect } from "@jest/globals";
import type { PoolClient } from "pg";
import { ProductService, type ProductListCache } from "@/services/product.service.js";
import type { Product, ProductListQuery } from "@/types/product.types.js";
import type { ProductVariant } from "@/types/product-variant.types.js";
import type { Database } from "@/database/database.interface.js";
import type { ProductRepository } from "@/repositories/products/product/product.interface.js";
import type { ProductVariantRepository } from "@/repositories/products/product-variant/product-variant.interface.js";
import type { Storage } from "@/storage/storage.interface.js";
import {
  convertEurToPln,
  type ExchangeRateProvider,
} from "@/services/exchange-rate.service.js";
import { ValidationError } from "@/errors/validation.error.js";

const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

const client = mockClient as unknown as PoolClient;

const now = new Date("2026-01-01T00:00:00.000Z");

const vinylAttributes = {
  artists: ["Bunnington Judah", "Zulu Vibes"],
  tracklist: [],
  previewLinks: [],
};

const vinylVariantAttributes = {
  format: '7"',
  mediaCondition: "NM",
  sleeveCondition: "generic",
};

const makeProduct = (overrides: Partial<Product> = {}): Product => ({
  id: 1,
  type: "vinyl",
  title: "Jah Prophecy",
  slug: "bunnington-judah-zulu-vibes-jah-prophecy-1",
  description: null,
  isPublished: false,
  attributes: vinylAttributes,
  isDeleted: false,
  createdAt: now,
  updatedAt: now,
  deletedAt: null,
  ...overrides,
});

const makeVariant = (overrides: Partial<ProductVariant> = {}): ProductVariant => ({
  id: 1,
  productId: 1,
  priceEur: 1500,
  quantity: 1,
  attributes: vinylVariantAttributes,
  media: [],
  isDeleted: false,
  createdAt: now,
  updatedAt: now,
  deletedAt: null,
  ...overrides,
});

const listQuery = (overrides: Partial<ProductListQuery> = {}): ProductListQuery => ({
  page: 1,
  limit: 20,
  status: "published",
  sort: "newest",
  ...overrides,
});

const queries = () => mockClient.query.mock.calls.map((call) => call[0]);

describe("convertEurToPln", () => {
  it.each([
    [1500, 4.3, 6500],
    [1000, 4.3, 4300],
    [1, 4.3, 100],
    [0, 4.3, 0],
    [12345, 4.2735, 52800],
  ])("should convert %i euro cents at %f to %i grosze", (eur, rate, pln) => {
    expect(convertEurToPln(eur, rate)).toBe(pln);
  });
});

describe("ProductService", () => {
  let productService: ProductService;
  let productRepository: jest.Mocked<ProductRepository>;
  let productVariantRepository: jest.Mocked<ProductVariantRepository>;
  let storage: jest.Mocked<Storage>;
  let exchangeRates: jest.Mocked<ExchangeRateProvider>;
  let mockPool: Database;
  let cache: jest.Mocked<ProductListCache>;

  beforeEach(() => {
    jest.clearAllMocks();

    productRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findAllWithVariants: jest.fn(),
      countAll: jest.fn(),
      update: jest.fn(),
      setPublished: jest.fn(),
      hasOrders: jest.fn(),
      findMediaUrls: jest.fn(),
      delete: jest.fn(),
      hardDelete: jest.fn(),
    };

    productVariantRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByProductId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      hasOrders: jest.fn(),
      findMediaUrls: jest.fn(),
      hardDelete: jest.fn(),
    };

    storage = {
      save: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
    };

    exchangeRates = {
      getEurPlnRate: jest.fn<() => Promise<number | null>>().mockResolvedValue(4.3),
    };

    mockPool = {
      connect: jest
        .fn<() => Promise<PoolClient>>()
        .mockResolvedValue(client),
    };

    cache = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
    };

    productService = new ProductService(
      productRepository,
      productVariantRepository,
      mockPool,
      cache,
      storage,
      exchangeRates,
    );
  });

  describe("createProduct", () => {
    it("should create a draft vinyl with validated attributes, slug base, variants and PLN prices", async () => {
      productRepository.create.mockResolvedValue(makeProduct());
      productVariantRepository.create.mockResolvedValue(makeVariant());

      const result = await productService.createProduct({
        type: "vinyl",
        title: "Jah Prophecy",
        attributes: { artists: ["Bunnington Judah", "Zulu Vibes"] },
        variants: [
          { priceEur: 1500, quantity: 1, attributes: vinylVariantAttributes },
        ],
      });

      expect(productRepository.create).toHaveBeenCalledWith(client, {
        type: "vinyl",
        title: "Jah Prophecy",
        description: null,
        attributes: vinylAttributes,
        slugBase: "bunnington-judah-zulu-vibes-jah-prophecy",
      });
      expect(productVariantRepository.create).toHaveBeenCalledWith(client, {
        productId: 1,
        priceEur: 1500,
        quantity: 1,
        attributes: vinylVariantAttributes,
      });
      expect(result.variants[0]?.pricePln).toBe(6500);
      expect(queries()).toEqual(["BEGIN", "COMMIT"]);
      expect(cache.clear).toHaveBeenCalled();
      expect(mockClient.release).toHaveBeenCalled();
    });

    it("should build the slug from the title only for types without slug parts", async () => {
      productRepository.create.mockResolvedValue(
        makeProduct({ type: "other", attributes: {} }),
      );

      await productService.createProduct({
        type: "other",
        title: "Krzyż etiopski – mosiądz",
        attributes: {},
        variants: [],
      });

      expect(productRepository.create).toHaveBeenCalledWith(
        client,
        expect.objectContaining({ slugBase: "krzyz-etiopski-mosiadz" }),
      );
    });

    it("should reject invalid product attributes before opening a connection", async () => {
      await expect(
        productService.createProduct({
          type: "vinyl",
          title: "No Artists",
          attributes: {},
          variants: [],
        }),
      ).rejects.toBeInstanceOf(ValidationError);

      expect(mockPool.connect).not.toHaveBeenCalled();
    });

    it("should report the variant index in validation errors", async () => {
      const error = await productService
        .createProduct({
          type: "tshirt",
          title: "Lion T-Shirt",
          attributes: {},
          variants: [
            { priceEur: 2500, quantity: 1, attributes: { color: "Black", size: "M" } },
            { priceEur: 2500, quantity: 1, attributes: { color: "Black" } },
          ],
        })
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).errors).toEqual([
        expect.objectContaining({ path: "variants.1.attributes.size" }),
      ]);
    });

    it("should rollback when variant creation fails", async () => {
      productRepository.create.mockResolvedValue(
        makeProduct({ type: "other", attributes: {} }),
      );
      productVariantRepository.create.mockRejectedValue(new Error("Variant error"));

      await expect(
        productService.createProduct({
          type: "other",
          title: "Pendant",
          attributes: {},
          variants: [{ priceEur: 1200, quantity: 1, attributes: {} }],
        }),
      ).rejects.toThrow("Variant error");

      expect(queries()).toEqual(["BEGIN", "ROLLBACK"]);
      expect(cache.clear).not.toHaveBeenCalled();
    });
  });

  describe("updateProduct", () => {
    it("should update the title and description", async () => {
      const product = makeProduct({ title: "New Title", description: "Notes" });
      productRepository.findById.mockResolvedValue(makeProduct());
      productRepository.update.mockResolvedValue(product);
      productVariantRepository.findByProductId.mockResolvedValue([]);

      const result = await productService.updateProduct(1, {
        title: "New Title",
        description: "Notes",
      });

      expect(productRepository.update).toHaveBeenCalledWith(client, 1, {
        title: "New Title",
        description: "Notes",
        attributes: undefined,
      });
      expect(result).toEqual({ ...product, variants: [] });
      expect(queries()).toEqual(["BEGIN", "COMMIT"]);
    });

    it("should validate attributes against the stored product type", async () => {
      productRepository.findById.mockResolvedValue(makeProduct());

      await expect(
        productService.updateProduct(1, { attributes: { artists: [] } }),
      ).rejects.toBeInstanceOf(ValidationError);

      expect(productRepository.update).not.toHaveBeenCalled();
      expect(queries()).toEqual(["BEGIN", "ROLLBACK"]);
    });

    it("should return null when the product does not exist", async () => {
      productRepository.findById.mockResolvedValue(null);

      expect(await productService.updateProduct(999, { title: "X" })).toBeNull();
      expect(queries()).toEqual(["BEGIN", "ROLLBACK"]);
      expect(cache.clear).not.toHaveBeenCalled();
    });
  });

  describe("getProduct", () => {
    it("should only look for published products by default", async () => {
      productRepository.findById.mockResolvedValue(null);

      await productService.getProduct(6);

      expect(productRepository.findById).toHaveBeenCalledWith(6, client, "published");
    });

    it("should return null prices in PLN when no exchange rate is available", async () => {
      exchangeRates.getEurPlnRate.mockResolvedValue(null);
      productRepository.findById.mockResolvedValue(makeProduct());
      productVariantRepository.findByProductId.mockResolvedValue([makeVariant()]);

      const result = await productService.getProduct(1, "all");

      expect(result?.variants[0]?.pricePln).toBeNull();
    });
  });

  describe("getAllProducts", () => {
    it("should cache shop listings under a key built from the query", async () => {
      const products = [{ ...makeProduct(), variants: [makeVariant()] }];
      cache.get.mockResolvedValue(null);
      productRepository.findAllWithVariants.mockResolvedValue(products);
      productRepository.countAll.mockResolvedValue(1);

      const result = await productService.getAllProducts(
        listQuery({ format: '7"', priceMaxEur: 2000 }),
      );

      expect(cache.set).toHaveBeenCalledWith(
        'products:list:format=7":limit=20:page=1:priceMaxEur=2000:sort=newest:status=published',
        { products, total: 1 },
        60,
      );
      expect(result.products[0]?.variants[0]?.pricePln).toBe(6500);
    });

    it("should return cached products without touching the database", async () => {
      cache.get.mockResolvedValue({ products: [], total: 0 });

      await productService.getAllProducts(listQuery());

      expect(mockPool.connect).not.toHaveBeenCalled();
    });

    it.each([
      ["text search", listQuery({ q: "dub" })],
      ["the admin view", listQuery({ status: "all" })],
    ])("should not cache %s", async (_name, query) => {
      productRepository.findAllWithVariants.mockResolvedValue([]);
      productRepository.countAll.mockResolvedValue(0);

      await productService.getAllProducts(query);

      expect(cache.get).not.toHaveBeenCalled();
      expect(cache.set).not.toHaveBeenCalled();
    });
  });

  describe("publishProduct", () => {
    it("should publish and return type warnings", async () => {
      productRepository.findById.mockResolvedValue(makeProduct());
      productVariantRepository.findByProductId.mockResolvedValue([makeVariant()]);
      productRepository.setPublished.mockResolvedValue(
        makeProduct({ isPublished: true }),
      );

      const result = await productService.publishProduct(1);

      expect(productRepository.setPublished).toHaveBeenCalledWith(client, 1, true);
      expect(result?.product.isPublished).toBe(true);
      expect(result?.warnings).toEqual(["missing_preview"]);
      expect(cache.clear).toHaveBeenCalled();
    });

    it("should not warn about the preview when a variant has an audio recording", async () => {
      productRepository.findById.mockResolvedValue(makeProduct());
      productVariantRepository.findByProductId.mockResolvedValue([
        makeVariant({
          media: [
            {
              id: 1,
              productVariantId: 1,
              type: "audio" as ProductVariant["media"][number]["type"],
              url: "products/audio/a.mp3",
              alt: null,
              sortOrder: 0,
              isPrimary: false,
              createdAt: now,
              updatedAt: now,
            },
          ],
        }),
      ]);
      productRepository.setPublished.mockResolvedValue(
        makeProduct({ isPublished: true }),
      );

      expect((await productService.publishProduct(1))?.warnings).toEqual([]);
    });

    it("should refuse to publish a product without variants", async () => {
      productRepository.findById.mockResolvedValue(makeProduct());
      productVariantRepository.findByProductId.mockResolvedValue([]);

      await expect(productService.publishProduct(1)).rejects.toBeInstanceOf(
        ValidationError,
      );

      expect(productRepository.setPublished).not.toHaveBeenCalled();
      expect(queries()).toEqual(["BEGIN", "ROLLBACK"]);
    });

    it("should return null when the product does not exist", async () => {
      productRepository.findById.mockResolvedValue(null);

      expect(await productService.publishProduct(999)).toBeNull();
    });
  });

  describe("unpublishProduct", () => {
    it("should hide the product", async () => {
      productRepository.setPublished.mockResolvedValue(makeProduct());
      productVariantRepository.findByProductId.mockResolvedValue([]);

      const result = await productService.unpublishProduct(1);

      expect(productRepository.setPublished).toHaveBeenCalledWith(client, 1, false);
      expect(result?.isPublished).toBe(false);
    });
  });

  describe("deleteProduct", () => {
    it("should permanently delete a draft without orders and its files", async () => {
      productRepository.findById.mockResolvedValue(makeProduct());
      productRepository.hasOrders.mockResolvedValue(false);
      productRepository.findMediaUrls.mockResolvedValue(["a.jpg", "b.mp3"]);
      productRepository.hardDelete.mockResolvedValue(true);

      expect(await productService.deleteProduct(1)).toBe(true);
      expect(productRepository.delete).not.toHaveBeenCalled();
      expect(storage.delete).toHaveBeenCalledWith("a.jpg");
      expect(storage.delete).toHaveBeenCalledWith("b.mp3");
      expect(queries()).toEqual(["BEGIN", "COMMIT"]);
    });

    it("should still succeed when a media file cannot be removed", async () => {
      productRepository.findById.mockResolvedValue(makeProduct());
      productRepository.hasOrders.mockResolvedValue(false);
      productRepository.findMediaUrls.mockResolvedValue(["a.jpg"]);
      productRepository.hardDelete.mockResolvedValue(true);
      storage.delete.mockRejectedValue(new Error("disk error"));
      const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

      expect(await productService.deleteProduct(1)).toBe(true);

      consoleError.mockRestore();
    });

    it.each([
      ["a published product", makeProduct({ isPublished: true }), false],
      ["a draft with orders", makeProduct(), true],
    ])("should soft delete %s", async (_name, product, hasOrders) => {
      productRepository.findById.mockResolvedValue(product);
      productRepository.hasOrders.mockResolvedValue(hasOrders);
      productRepository.delete.mockResolvedValue(true);

      expect(await productService.deleteProduct(1)).toBe(true);
      expect(productRepository.hardDelete).not.toHaveBeenCalled();
      expect(storage.delete).not.toHaveBeenCalled();
    });

    it("should return false when the product does not exist", async () => {
      productRepository.findById.mockResolvedValue(null);

      expect(await productService.deleteProduct(999)).toBe(false);
      expect(queries()).toEqual(["BEGIN", "ROLLBACK"]);
    });
  });

  describe("variants", () => {
    it("should create a variant validated against the product type", async () => {
      productRepository.findById.mockResolvedValue(makeProduct());
      productVariantRepository.create.mockResolvedValue(makeVariant({ id: 2 }));

      const variant = await productService.createVariant(1, {
        priceEur: 1500,
        quantity: 1,
        attributes: vinylVariantAttributes,
      });

      expect(variant?.pricePln).toBe(6500);
      expect(cache.clear).toHaveBeenCalled();
    });

    it("should reject variant attributes of another product type", async () => {
      productRepository.findById.mockResolvedValue(makeProduct());

      await expect(
        productService.createVariant(1, {
          priceEur: 1500,
          quantity: 1,
          attributes: { color: "Black", size: "M" },
        }),
      ).rejects.toBeInstanceOf(ValidationError);

      expect(productVariantRepository.create).not.toHaveBeenCalled();
    });

    it("should return null when adding a variant to a missing product", async () => {
      productRepository.findById.mockResolvedValue(null);

      expect(
        await productService.createVariant(999, {
          priceEur: 1,
          quantity: 1,
          attributes: {},
        }),
      ).toBeNull();
    });

    it("should update a variant of the product", async () => {
      productRepository.findById.mockResolvedValue(makeProduct());
      productVariantRepository.findById.mockResolvedValue(makeVariant());

      await productService.updateVariant(1, 1, { quantity: 3 });

      expect(productVariantRepository.update).toHaveBeenCalledWith(client, 1, {
        priceEur: undefined,
        quantity: 3,
        attributes: undefined,
      });
    });

    it("should return null when the variant belongs to another product", async () => {
      productRepository.findById.mockResolvedValue(makeProduct());
      productVariantRepository.findById.mockResolvedValue(makeVariant({ productId: 2 }));

      expect(await productService.updateVariant(1, 1, { quantity: 3 })).toBeNull();
      expect(productVariantRepository.update).not.toHaveBeenCalled();
    });

    it("should permanently delete a variant of a draft without orders", async () => {
      productVariantRepository.findById.mockResolvedValue(makeVariant());
      productRepository.findById.mockResolvedValue(makeProduct());
      productVariantRepository.hasOrders.mockResolvedValue(false);
      productVariantRepository.findMediaUrls.mockResolvedValue(["a.jpg"]);
      productVariantRepository.hardDelete.mockResolvedValue(true);

      expect(await productService.deleteProductVariant(1, 1)).toBe(true);
      expect(storage.delete).toHaveBeenCalledWith("a.jpg");
      expect(productVariantRepository.delete).not.toHaveBeenCalled();
    });

    it("should soft delete a variant of a published product", async () => {
      productVariantRepository.findById.mockResolvedValue(makeVariant());
      productRepository.findById.mockResolvedValue(makeProduct({ isPublished: true }));
      productVariantRepository.delete.mockResolvedValue(true);

      expect(await productService.deleteProductVariant(1, 1)).toBe(true);
      expect(productVariantRepository.hardDelete).not.toHaveBeenCalled();
    });

    it("should return false when the variant belongs to another product", async () => {
      productVariantRepository.findById.mockResolvedValue(makeVariant({ productId: 2 }));

      expect(await productService.deleteProductVariant(1, 1)).toBe(false);
      expect(queries()).toEqual(["BEGIN", "ROLLBACK"]);
    });
  });
});
