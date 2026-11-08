import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { PoolClient } from "pg";

import type { Cache } from "@/cache/cache.interface.js";
import type { Database } from "@/database/database.interface.js";
import type { ProductVariantMediaInterface } from "@/repositories/products/product-media/product-variant-media.interface.js";
import { ProductVariantMediaService } from "@/services/product-variant-media.service.js";
import type { Storage } from "@/storage/storage.interface.js";
import type {
  AudioFile,
  AudioProcessor,
} from "@/audio/audio-processor.interface.js";
import {
  ProductVariantMediaType,
  type ProductVariantMedia,
} from "@/types/product-variant-media.types.js";

describe("ProductVariantMediaService", () => {
  let service: ProductVariantMediaService;

  const mediaRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    findByProductVariantId: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  } as unknown as jest.Mocked<ProductVariantMediaInterface>;

  const storage = {
    save: jest.fn(),
    delete: jest.fn(),
  } as unknown as jest.Mocked<Storage>;

  const client = {
    release: jest.fn(),
  } as unknown as PoolClient;

  const pool = {
    connect: jest.fn(async () => client),
  } as unknown as jest.Mocked<Database>;

  const productCache = {
    clear: jest.fn(async () => undefined),
  } as unknown as jest.Mocked<Cache<unknown>>;

  const audioProcessor = {
    process: jest.fn(async (file: AudioFile) => file),
  } as unknown as jest.Mocked<AudioProcessor>;

  beforeEach(() => {
    jest.clearAllMocks();

    pool.connect = jest.fn(async () => client);
    productCache.clear = jest.fn(async () => undefined);

    service = new ProductVariantMediaService(
      mediaRepository,
      storage,
      pool,
      productCache,
      audioProcessor,
    );
  });

  describe("media type detection", () => {
    it.each([
      ["photo.jpg", "image/jpeg", ProductVariantMediaType.PHOTO, "photo"],
      ["photo.jpeg", "image/jpeg", ProductVariantMediaType.PHOTO, "photo"],
      ["photo.png", "image/png", ProductVariantMediaType.PHOTO, "photo"],
      ["photo.webp", "image/webp", ProductVariantMediaType.PHOTO, "photo"],
      ["photo.gif", "image/gif", ProductVariantMediaType.PHOTO, "photo"],
      ["video.mp4", "video/mp4", ProductVariantMediaType.VIDEO, "video"],
      ["audio.wav", "audio/wav", ProductVariantMediaType.AUDIO, "audio"],
      [
        "document.pdf",
        "application/pdf",
        ProductVariantMediaType.DOCUMENT,
        "doc",
      ],
    ])(
      "should detect %s as %s",
      async (filename, contentType, expectedType, expectedFolder) => {
        const media: ProductVariantMedia = {
          id: 1,
          productVariantId: 1,
          type: expectedType,
          url: `products/${expectedFolder}/variant-1-123456789.${filename.split(".").pop()}`,
          alt: "Test media",
          sortOrder: 0,
          isPrimary: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mediaRepository.create.mockResolvedValue(media);
        storage.save.mockResolvedValue(media.url);

        const result = await service.create(
          1,
          Buffer.from("test"),
          filename,
          contentType,
          "Test media",
          0,
          false,
        );

        expect(result.type).toBe(expectedType);

        expect(storage.save).toHaveBeenCalledWith(
          Buffer.from("test"),
          expect.stringMatching(
            new RegExp(
              `^products/${expectedFolder}/variant-1-\\d+\\.${filename.split(".").pop()}$`,
            ),
          ),
          contentType,
        );

        expect(mediaRepository.create).toHaveBeenCalledWith(
          client,
          1,
          expectedType,
          media.url,
          "Test media",
          0,
          false,
        );
      },
    );
  });

  describe("audio processing", () => {
    it("should store the processed audio file instead of the upload", async () => {
      const processed: AudioFile = {
        buffer: Buffer.from("mp3"),
        extension: "mp3",
        contentType: "audio/mpeg",
      };
      audioProcessor.process.mockResolvedValueOnce(processed);
      storage.save.mockResolvedValue("products/audio/variant-1-1.mp3");
      mediaRepository.create.mockResolvedValue({} as ProductVariantMedia);

      await service.create(1, Buffer.from("wav"), "side-a.wav", "audio/wav", null, 0, false);

      expect(audioProcessor.process).toHaveBeenCalledWith({
        buffer: Buffer.from("wav"),
        extension: "wav",
        contentType: "audio/wav",
      });
      expect(storage.save).toHaveBeenCalledWith(
        Buffer.from("mp3"),
        expect.stringMatching(/^products\/audio\/variant-1-\d+\.mp3$/),
        "audio/mpeg",
      );
    });

    it("should not process photos", async () => {
      storage.save.mockResolvedValue("products/photo/variant-1-1.jpg");
      mediaRepository.create.mockResolvedValue({} as ProductVariantMedia);

      await service.create(1, Buffer.from("jpg"), "label.jpg", "image/jpeg", null, 0, true);

      expect(audioProcessor.process).not.toHaveBeenCalled();
    });
  });

  describe("create", () => {
    it("should create product variant media", async () => {
      const media: ProductVariantMedia = {
        id: 1,
        productVariantId: 1,
        type: ProductVariantMediaType.PHOTO,
        url: "products/photo/variant-1-123456789.jpg",
        alt: "Test photo",
        sortOrder: 0,
        isPrimary: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mediaRepository.create.mockResolvedValue(media);
      storage.save.mockResolvedValue(media.url);

      const result = await service.create(
        1,
        Buffer.from("test"),
        "photo.jpg",
        "image/jpeg",
        "Test photo",
        0,
        true,
      );

      expect(result).toEqual(media);
      expect(mediaRepository.create).toHaveBeenCalled();
      expect(storage.save).toHaveBeenCalled();
      expect(productCache.clear).toHaveBeenCalled();
      expect(client.release).toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("should update product variant media", async () => {
      const media: ProductVariantMedia = {
        id: 1,
        productVariantId: 1,
        type: ProductVariantMediaType.PHOTO,
        url: "products/photo/variant-1-123456789.jpg",
        alt: "Updated photo",
        sortOrder: 1,
        isPrimary: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mediaRepository.update.mockResolvedValue(media);

      const result = await service.update(1, "Updated photo", 1, false);

      expect(result).toEqual(media);

      expect(mediaRepository.update).toHaveBeenCalledWith(
        client,
        1,
        "Updated photo",
        1,
        false,
      );

      expect(productCache.clear).toHaveBeenCalled();
      expect(client.release).toHaveBeenCalled();
    });

    it("should return null when media does not exist", async () => {
      mediaRepository.update.mockResolvedValue(null);

      const result = await service.update(999, "Updated photo", 1, false);

      expect(result).toBeNull();
      expect(productCache.clear).not.toHaveBeenCalled();
      expect(client.release).toHaveBeenCalled();
    });
  });

  describe("delete", () => {
    it("should delete product variant media", async () => {
      const media: ProductVariantMedia = {
        id: 1,
        productVariantId: 1,
        type: ProductVariantMediaType.PHOTO,
        url: "products/photo/variant-1-123456789.jpg",
        alt: "Test photo",
        sortOrder: 0,
        isPrimary: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mediaRepository.findById.mockResolvedValue(media);
      mediaRepository.delete.mockResolvedValue(true);

      const result = await service.delete(1);

      expect(result).toBe(true);

      expect(mediaRepository.findById).toHaveBeenCalledWith(client, 1);

      expect(mediaRepository.delete).toHaveBeenCalledWith(client, 1);

      expect(storage.delete).toHaveBeenCalledWith(media.url);
      expect(productCache.clear).toHaveBeenCalled();
      expect(client.release).toHaveBeenCalled();
    });

    it("should return false when media does not exist", async () => {
      mediaRepository.findById.mockResolvedValue(null);

      const result = await service.delete(999);

      expect(result).toBe(false);
      expect(mediaRepository.delete).not.toHaveBeenCalled();
      expect(storage.delete).not.toHaveBeenCalled();
      expect(productCache.clear).not.toHaveBeenCalled();
      expect(client.release).toHaveBeenCalled();
    });
  });
});
