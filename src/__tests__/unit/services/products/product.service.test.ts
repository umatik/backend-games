import { beforeEach, describe, jest, it, expect } from "@jest/globals";
import type { PoolClient } from "pg";
import { ProductService } from "@/services/product.service.js";
import type { Cache } from "@/cache/cache.interface.js";
import type { Product, ProductDetails } from "@/types/product.types.js";
import type { ProductVariant } from "@/types/product-variant.types.js";
import type { Database } from "@/database/database.interface.js";
import type { ProductRepository } from "@/repositories/products/product/product.interface.js";
import type { ProductVariantRepository } from "@/repositories/products/product-variant/product-variant.interface.js";
import type { ProductVariantMediaInterface } from "@/repositories/products/product-media/product-variant-media.interface.js";
import { ProductVariantNotFoundError } from "@/errors/product-variant-not-found.error.js";
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

const queries = () => mockClient.query.mock.calls.map((call) => call[0]);

describe("ProductService", () => {
  let productService: ProductService;
  let productRepository: jest.Mocked<ProductRepository>;
  let productVariantRepository: jest.Mocked<ProductVariantRepository>;
  let productVariantMediaRepository: jest.Mocked<ProductVariantMediaInterface>;
  let mockPool: Database;

  let cache: jest.Mocked<
    Cache<{
      products: ProductDetails[];
      total: number;
    }>
  >;

  beforeEach(() => {
    jest.clearAllMocks();

    productRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findAllWithVariants: jest.fn(),
      countAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    productVariantRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByProductId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    productVariantMediaRepository = {
      findByProductVariantId: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    mockPool = {
      connect: jest
        .fn<() => Promise<PoolClient>>()
        .mockResolvedValue(mockClient as unknown as PoolClient),
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
      productVariantMediaRepository,
    );
  });

  describe("createProduct", () => {
    it("should create a vinyl with validated attributes, slug base and variants", async () => {
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
      expect(result.variants).toHaveLength(1);
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

    it("should reject an unknown product type", async () => {
      await expect(
        productService.createProduct({
          type: "cassette",
          title: "Tape",
          attributes: {},
          variants: [],
        }),
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it("should rollback when product creation fails", async () => {
      productRepository.create.mockRejectedValue(new Error("Database error"));

      await expect(
        productService.createProduct({
          type: "other",
          title: "Pendant",
          attributes: {},
          variants: [],
        }),
      ).rejects.toThrow("Database error");

      expect(queries()).toEqual(["BEGIN", "ROLLBACK"]);
      expect(cache.clear).not.toHaveBeenCalled();
      expect(mockClient.release).toHaveBeenCalled();
    });

    it("should rollback when variant creation fails", async () => {
      productRepository.create.mockResolvedValue(
        makeProduct({ type: "other", attributes: {} }),
      );
      productVariantRepository.create.mockRejectedValue(
        new Error("Variant error"),
      );

      await expect(
        productService.createProduct({
          type: "other",
          title: "Pendant",
          attributes: {},
          variants: [{ priceEur: 1200, quantity: 1, attributes: {} }],
        }),
      ).rejects.toThrow("Variant error");

      expect(queries()).toEqual(["BEGIN", "ROLLBACK"]);
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
      expect(cache.clear).toHaveBeenCalled();
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

      const result = await productService.updateProduct(999, { title: "X" });

      expect(result).toBeNull();
      expect(queries()).toEqual(["BEGIN", "ROLLBACK"]);
    });

    it("should update an existing variant", async () => {
      const updatedAttributes = { ...vinylVariantAttributes, mediaCondition: "VG+" };
      productRepository.findById.mockResolvedValue(makeProduct());
      productRepository.update.mockResolvedValue(makeProduct());
      productVariantRepository.findById.mockResolvedValue(makeVariant());
      productVariantRepository.findByProductId.mockResolvedValue([
        makeVariant({ priceEur: 1000, attributes: updatedAttributes }),
      ]);

      await productService.updateProduct(1, {
        variants: [{ id: 1, priceEur: 1000, attributes: updatedAttributes }],
      });

      expect(productVariantRepository.update).toHaveBeenCalledWith(client, 1, {
        priceEur: 1000,
        quantity: undefined,
        attributes: updatedAttributes,
      });
    });

    it("should create a new variant with default quantity", async () => {
      productRepository.findById.mockResolvedValue(makeProduct());
      productRepository.update.mockResolvedValue(makeProduct());
      productVariantRepository.findByProductId.mockResolvedValue([]);

      await productService.updateProduct(1, {
        variants: [{ priceEur: 2000, attributes: vinylVariantAttributes }],
      });

      expect(productVariantRepository.create).toHaveBeenCalledWith(client, {
        productId: 1,
        priceEur: 2000,
        quantity: 1,
        attributes: vinylVariantAttributes,
      });
    });

    it("should require type-specific fields for a new variant without attributes", async () => {
      productRepository.findById.mockResolvedValue(makeProduct());
      productRepository.update.mockResolvedValue(makeProduct());

      await expect(
        productService.updateProduct(1, { variants: [{ priceEur: 2000 }] }),
      ).rejects.toBeInstanceOf(ValidationError);

      expect(productVariantRepository.create).not.toHaveBeenCalled();
      expect(queries()).toEqual(["BEGIN", "ROLLBACK"]);
    });

    it("should rollback when the variant does not exist", async () => {
      productRepository.findById.mockResolvedValue(makeProduct());
      productRepository.update.mockResolvedValue(makeProduct());
      productVariantRepository.findById.mockResolvedValue(null);

      await expect(
        productService.updateProduct(1, { variants: [{ id: 99, quantity: 2 }] }),
      ).rejects.toBeInstanceOf(ProductVariantNotFoundError);

      expect(queries()).toEqual(["BEGIN", "ROLLBACK"]);
    });

    it("should rollback when the variant belongs to another product", async () => {
      productRepository.findById.mockResolvedValue(makeProduct());
      productRepository.update.mockResolvedValue(makeProduct());
      productVariantRepository.findById.mockResolvedValue(
        makeVariant({ productId: 2 }),
      );

      await expect(
        productService.updateProduct(1, { variants: [{ id: 1, quantity: 2 }] }),
      ).rejects.toBeInstanceOf(ProductVariantNotFoundError);

      expect(productVariantRepository.update).not.toHaveBeenCalled();
    });
  });

  describe("getProduct", () => {
    it("should get a product with variants", async () => {
      productRepository.findById.mockResolvedValue(makeProduct());
      productVariantRepository.findByProductId.mockResolvedValue([makeVariant()]);

      const result = await productService.getProduct(1);

      expect(result).toEqual({ ...makeProduct(), variants: [makeVariant()] });
      expect(mockClient.release).toHaveBeenCalled();
    });

    it("should return null when the product does not exist", async () => {
      productRepository.findById.mockResolvedValue(null);

      expect(await productService.getProduct(999)).toBeNull();
      expect(productVariantRepository.findByProductId).not.toHaveBeenCalled();
    });
  });

  describe("getAllProducts", () => {
    it("should load products from the database on cache miss", async () => {
      const products = [{ ...makeProduct(), variants: [] }];
      cache.get.mockResolvedValue(null);
      productRepository.findAllWithVariants.mockResolvedValue(products);
      productRepository.countAll.mockResolvedValue(1);

      const result = await productService.getAllProducts(1, 20);

      expect(result).toEqual({ products, total: 1 });
      expect(cache.set).toHaveBeenCalledWith(
        "products:page=1:limit=20",
        { products, total: 1 },
        60,
      );
    });

    it("should return products from cache on cache hit", async () => {
      const cached = { products: [{ ...makeProduct(), variants: [] }], total: 1 };
      cache.get.mockResolvedValue(cached);

      const result = await productService.getAllProducts(1, 20);

      expect(result).toBe(cached);
      expect(mockPool.connect).not.toHaveBeenCalled();
    });
  });

  describe("deleteProductVariant", () => {
    it("should delete a product variant", async () => {
      productVariantRepository.findById.mockResolvedValue(makeVariant());
      productVariantRepository.delete.mockResolvedValue(true);

      expect(await productService.deleteProductVariant(1, 1)).toBe(true);
      expect(queries()).toEqual(["BEGIN", "COMMIT"]);
      expect(cache.clear).toHaveBeenCalled();
    });

    it("should return false when the variant does not exist", async () => {
      productVariantRepository.findById.mockResolvedValue(null);

      expect(await productService.deleteProductVariant(1, 99)).toBe(false);
      expect(queries()).toEqual(["BEGIN", "ROLLBACK"]);
    });

    it("should return false when the variant belongs to another product", async () => {
      productVariantRepository.findById.mockResolvedValue(
        makeVariant({ productId: 2 }),
      );

      expect(await productService.deleteProductVariant(1, 1)).toBe(false);
      expect(productVariantRepository.delete).not.toHaveBeenCalled();
    });

    it("should rollback when deleting throws", async () => {
      productVariantRepository.findById.mockResolvedValue(makeVariant());
      productVariantRepository.delete.mockRejectedValue(new Error("Delete error"));

      await expect(productService.deleteProductVariant(1, 1)).rejects.toThrow(
        "Delete error",
      );
      expect(queries()).toEqual(["BEGIN", "ROLLBACK"]);
    });
  });

  describe("deleteProduct", () => {
    it("should delete a product", async () => {
      productRepository.delete.mockResolvedValue(true);

      expect(await productService.deleteProduct(1)).toBe(true);
      expect(cache.clear).toHaveBeenCalled();
    });

    it("should return false when product deletion fails", async () => {
      productRepository.delete.mockResolvedValue(false);

      expect(await productService.deleteProduct(1)).toBe(false);
      expect(queries()).toEqual(["BEGIN", "ROLLBACK"]);
    });
  });
});
