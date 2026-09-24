import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import type { PoolClient } from "pg";

import type { Cache } from "@/cache/cache.interface.js";
import type { Database } from "@/database/database.interface.js";
import type { ProductVariantMediaInterface } from "@/repositories/products/product-media/product-variant-media.interface.js";
import { ProductVariantMediaService } from "@/services/product-variant-media.service.js";
import type { Storage } from "@/storage/storage.interface.js";
import type { ProductVariantMedia } from "@/types/product-variant-media.types.js";

describe("ProductVariantMediaService", () => {
  let service: ProductVariantMediaService;

  let mediaRepository: jest.Mocked<ProductVariantMediaInterface>;
  let storage: jest.Mocked<Storage>;
  let database: jest.Mocked<Database>;
  let productCache: jest.Mocked<Cache<unknown>>;

  const client = {
    release: jest.fn(),
  } as unknown as PoolClient;

  const media: ProductVariantMedia = {
    id: 1,
    productVariantId: 99,
    type: "photo",
    url: "products/variants/99/image.jpg",
    alt: "Product image",
    sortOrder: 1,
    isPrimary: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mediaRepository = {
      findByProductVariantId: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<ProductVariantMediaInterface>;

    storage = {
      save: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
    };

    database = {
      connect: jest.fn(),
    } as jest.Mocked<Database>;

    database.connect.mockResolvedValue(client);

    productCache = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
    } as jest.Mocked<Cache<unknown>>;

    service = new ProductVariantMediaService(
      mediaRepository,
      storage,
      database,
      productCache,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("findByProductVariantId", () => {
    it("should return media for a product variant", async () => {
      mediaRepository.findByProductVariantId.mockResolvedValue([media]);

      const result = await service.findByProductVariantId(99);

      expect(result).toEqual([media]);

      expect(mediaRepository.findByProductVariantId).toHaveBeenCalledWith(
        client,
        99,
      );

      expect(client.release).toHaveBeenCalled();
    });
  });

  describe("findById", () => {
    it("should return media by id", async () => {
      mediaRepository.findById.mockResolvedValue(media);

      const result = await service.findById(1);

      expect(result).toEqual(media);

      expect(mediaRepository.findById).toHaveBeenCalledWith(client, 1);

      expect(client.release).toHaveBeenCalled();
    });

    it("should return null when media does not exist", async () => {
      mediaRepository.findById.mockResolvedValue(null);

      const result = await service.findById(999);

      expect(result).toBeNull();

      expect(mediaRepository.findById).toHaveBeenCalledWith(client, 999);

      expect(client.release).toHaveBeenCalled();
    });
  });

  describe("create", () => {
    it("should save the file and create media record", async () => {
      const file = Buffer.from("test");

      storage.save.mockResolvedValue("products/variants/99/image.jpg");

      mediaRepository.create.mockResolvedValue(media);

      const result = await service.create(
        99,
        file,
        "image.jpg",
        "image/jpeg",
        "Product image",
        1,
        true,
      );

      expect(result).toEqual(media);

      expect(storage.save).toHaveBeenCalledWith(
        file,
        "image.jpg",
        "image/jpeg",
      );

      expect(mediaRepository.create).toHaveBeenCalledWith(
        client,
        99,
        "photo",
        "products/variants/99/image.jpg",
        "Product image",
        1,
        true,
      );

      expect(client.release).toHaveBeenCalled();
      expect(productCache.clear).toHaveBeenCalled();
    });

    it("should delete the file when creating the database record fails", async () => {
      const file = Buffer.from("test");

      storage.save.mockResolvedValue("products/variants/99/image.jpg");

      mediaRepository.create.mockRejectedValue(new Error("Database error"));

      await expect(
        service.create(
          99,
          file,
          "image.jpg",
          "image/jpeg",
          "Product image",
          1,
          true,
        ),
      ).rejects.toThrow("Database error");

      expect(storage.delete).toHaveBeenCalledWith(
        "products/variants/99/image.jpg",
      );

      expect(client.release).toHaveBeenCalled();
      expect(productCache.clear).not.toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("should update media metadata", async () => {
      const updatedMedia = {
        ...media,
        alt: "Updated image",
        sortOrder: 2,
        isPrimary: false,
      };

      mediaRepository.update.mockResolvedValue(updatedMedia);

      const result = await service.update(1, "Updated image", 2, false);

      expect(result).toEqual(updatedMedia);

      expect(mediaRepository.update).toHaveBeenCalledWith(
        client,
        1,
        "Updated image",
        2,
        false,
      );

      expect(client.release).toHaveBeenCalled();
      expect(productCache.clear).toHaveBeenCalled();
    });
  });

  describe("delete", () => {
    it("should delete media record and file", async () => {
      mediaRepository.findById.mockResolvedValue(media);
      mediaRepository.delete.mockResolvedValue(true);

      const result = await service.delete(1);

      expect(result).toBe(true);

      expect(mediaRepository.findById).toHaveBeenCalledWith(client, 1);

      expect(mediaRepository.delete).toHaveBeenCalledWith(client, 1);

      expect(storage.delete).toHaveBeenCalledWith(media.url);

      expect(client.release).toHaveBeenCalled();
      expect(productCache.clear).toHaveBeenCalled();
    });

    it("should return false when media does not exist", async () => {
      mediaRepository.findById.mockResolvedValue(null);

      const result = await service.delete(999);

      expect(result).toBe(false);

      expect(mediaRepository.delete).not.toHaveBeenCalled();
      expect(storage.delete).not.toHaveBeenCalled();

      expect(client.release).toHaveBeenCalled();
      expect(productCache.clear).not.toHaveBeenCalled();
    });

    it("should not delete the file when database deletion fails", async () => {
      mediaRepository.findById.mockResolvedValue(media);
      mediaRepository.delete.mockResolvedValue(false);

      const result = await service.delete(1);

      expect(result).toBe(false);

      expect(storage.delete).not.toHaveBeenCalled();

      expect(client.release).toHaveBeenCalled();
      expect(productCache.clear).not.toHaveBeenCalled();
    });
  });
});
