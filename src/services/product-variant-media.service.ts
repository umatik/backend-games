import type { Database } from "@/database/database.interface.js";
import type { Storage } from "@/storage/storage.interface.js";
import type { ProductVariantMedia } from "@/types/product-variant-media.types.js";
import type { ProductVariantMediaInterface } from "@/repositories/products/product-media/product-variant-media.interface.js";
import type { Cache } from "@/cache/cache.interface.js";
import { getProductVariantMediaType } from "@/validators/product-variant-media.validator.js";

export class ProductVariantMediaService {
  constructor(
    private productVariantMediaRepository: ProductVariantMediaInterface,
    private storage: Storage,
    private pool: Database,
    private productCache: Cache<unknown>,
  ) {}

  async findByProductVariantId(
    productVariantId: number,
  ): Promise<ProductVariantMedia[]> {
    const client = await this.pool.connect();

    try {
      return await this.productVariantMediaRepository.findByProductVariantId(
        client,
        productVariantId,
      );
    } finally {
      client.release();
    }
  }

  async findById(mediaId: number): Promise<ProductVariantMedia | null> {
    const client = await this.pool.connect();

    try {
      return await this.productVariantMediaRepository.findById(client, mediaId);
    } finally {
      client.release();
    }
  }

  async create(
    productVariantId: number,
    file: Buffer,
    filename: string,
    contentType: string,
    alt: string | null,
    sortOrder: number,
    isPrimary: boolean,
  ): Promise<ProductVariantMedia> {
    const type = getProductVariantMediaType(filename, contentType);

    if (!type) {
      throw new Error("Unsupported media type");
    }

    // const url = await this.storage.save(file, filename, contentType);
    const url = filename;
    const client = await this.pool.connect();

    try {
      const media = await this.productVariantMediaRepository.create(
        client,
        productVariantId,
        type,
        url,
        alt,
        sortOrder,
        isPrimary,
      );

      await this.productCache.clear();

      return media;
    } catch (error) {
      await this.storage.delete(url);
      throw error;
    } finally {
      client.release();
    }
  }

  async update(
    mediaId: number,
    alt: string | null,
    sortOrder: number,
    isPrimary: boolean,
  ): Promise<ProductVariantMedia | null> {
    const client = await this.pool.connect();

    try {
      const media = await this.productVariantMediaRepository.update(
        client,
        mediaId,
        alt,
        sortOrder,
        isPrimary,
      );

      if (media) {
        await this.productCache.clear();
      }

      return media;
    } finally {
      client.release();
    }
  }

  async delete(mediaId: number): Promise<boolean> {
    const client = await this.pool.connect();

    try {
      const media = await this.productVariantMediaRepository.findById(
        client,
        mediaId,
      );

      if (!media) {
        return false;
      }

      const deleted = await this.productVariantMediaRepository.delete(
        client,
        mediaId,
      );

      if (deleted) {
        await this.storage.delete(media.url);
        await this.productCache.clear();
      }

      return deleted;
    } finally {
      client.release();
    }
  }
}
