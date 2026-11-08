import type {
  CreateProductData,
  PricedProductDetails,
  PricedProductVariant,
  ProductDetails,
  ProductListQuery,
  ProductStatus,
  UpdateProductData,
} from "@/types/product.types.js";
import type {
  CreateProductVariantInput,
  ProductVariant,
  UpdateProductVariantData,
} from "@/types/product-variant.types.js";
import type { Cache } from "@/cache/cache.interface.js";
import type { Database } from "@/database/database.interface.js";
import type { ProductRepository } from "@/repositories/products/product/product.interface.js";
import type { ProductVariantRepository } from "@/repositories/products/product-variant/product-variant.interface.js";
import type { Storage } from "@/storage/storage.interface.js";
import type { PendingUploadRepository } from "@/repositories/pending-upload/pending-upload.interface.js";
import type { ProductVariantMediaInterface } from "@/repositories/products/product-media/product-variant-media.interface.js";
import { ProductVariantMediaType } from "@/types/product-variant-media.types.js";
import {
  getProductType,
  type ProductTypeDefinition,
} from "@/product-types/index.js";
import { ValidationError } from "@/errors/validation.error.js";
import { formatZodIssues } from "@/validators/helpers/zod.js";
import { slugify } from "@/utils/slugify.js";
import {
  convertEurToPln,
  type ExchangeRateProvider,
} from "@/services/exchange-rate.service.js";

export type ProductListCache = Cache<{
  products: ProductDetails[];
  total: number;
}>;

const LIST_CACHE_TTL_SECONDS = 60;

export class ProductService {
  constructor(
    private productRepository: ProductRepository,
    private productVariantRepository: ProductVariantRepository,
    private pool: Database,
    private cache: ProductListCache,
    private storage: Storage,
    private exchangeRates: ExchangeRateProvider,
    private pendingUploads: PendingUploadRepository,
    private productVariantMediaRepository: ProductVariantMediaInterface,
  ) {}

  // ------------------------------------------------------------------
  // Produkty
  // ------------------------------------------------------------------

  /** Tworzy produkt jako szkic (niewidoczny w sklepie). */
  async createProduct(data: CreateProductData): Promise<PricedProductDetails> {
    const type = this.getType(data.type);
    const attributes = this.parseAttributes(
      type.productAttributes,
      data.attributes,
      "attributes",
    );
    const variants = data.variants.map((variant, index) => ({
      ...variant,
      attributes: this.parseAttributes(
        type.variantAttributes,
        variant.attributes,
        `variants.${index}.attributes`,
      ),
    }));

    const product = await this.inTransaction(async (client) => {
      const created = await this.productRepository.create(client, {
        type: type.key,
        title: data.title,
        description: data.description ?? null,
        attributes,
        slugBase: this.buildSlugBase(type, data.title, attributes),
      });

      const createdVariants: ProductVariant[] = [];

      for (const [index, variant] of variants.entries()) {
        createdVariants.push(
          await this.createVariantWithPhotos(client, created.id, variant, `variants.${index}`),
        );
      }

      return { ...created, variants: createdVariants };
    });

    if (!product) {
      throw new Error("Product was not created");
    }

    await this.cache.clear();

    return this.withPln(product);
  }

  async updateProduct(
    id: number,
    data: UpdateProductData,
  ): Promise<PricedProductDetails | null> {
    const product = await this.inTransaction(async (client) => {
      const existing = await this.productRepository.findById(id, client);

      if (!existing) {
        return null;
      }

      const type = this.getType(existing.type);

      const updated = await this.productRepository.update(client, id, {
        title: data.title,
        description: data.description,
        attributes:
          data.attributes === undefined
            ? undefined
            : this.parseAttributes(
                type.productAttributes,
                data.attributes,
                "attributes",
              ),
      });

      if (!updated) {
        return null;
      }

      const variants = await this.productVariantRepository.findByProductId(
        client,
        id,
      );

      return { ...updated, variants };
    });

    if (!product) {
      return null;
    }

    await this.cache.clear();

    return this.withPln(product);
  }

  /** Zwraca produkt z wariantami; `status` pozwala ukryć szkice przed sklepem. */
  async getProduct(
    id: number,
    status: ProductStatus = "published",
  ): Promise<PricedProductDetails | null> {
    const product = await this.withClient(async (client) => {
      const found = await this.productRepository.findById(id, client, status);

      if (!found) {
        return null;
      }

      const variants = await this.productVariantRepository.findByProductId(
        client,
        id,
      );

      return { ...found, variants };
    });

    return product ? this.withPln(product) : null;
  }

  async getAllProducts(query: ProductListQuery): Promise<{
    products: PricedProductDetails[];
    total: number;
  }> {
    // Cache tylko dla sklepu i bez wyszukiwania tekstowego (każde zapytanie byłoby inne).
    const cacheKey =
      query.status === "published" && query.q === undefined
        ? this.buildListCacheKey(query)
        : null;

    const result =
      (cacheKey ? await this.cache.get(cacheKey) : null) ??
      (await this.withClient(async (client) => {
        const products = await this.productRepository.findAllWithVariants(
          client,
          query,
        );
        const total = await this.productRepository.countAll(client, query);
        const loaded = { products, total };

        if (cacheKey) {
          await this.cache.set(cacheKey, loaded, LIST_CACHE_TTL_SECONDS);
        }

        return loaded;
      }));

    const rate = await this.exchangeRates.getEurPlnRate();

    return {
      products: result.products.map((product) => this.withRate(product, rate)),
      total: result.total,
    };
  }

  /**
   * Publikuje produkt. Wymaga co najmniej jednego wariantu; brak odsłuchu i inne braki
   * nie blokują publikacji, tylko trafiają do `warnings`.
   */
  async publishProduct(
    id: number,
  ): Promise<{ product: PricedProductDetails; warnings: string[] } | null> {
    const product = await this.inTransaction(async (client) => {
      const existing = await this.productRepository.findById(id, client);

      if (!existing) {
        return null;
      }

      const variants = await this.productVariantRepository.findByProductId(
        client,
        id,
      );

      if (variants.length === 0) {
        throw new ValidationError("Product cannot be published", [
          { path: "variants", message: "At least one variant is required" },
        ]);
      }

      const published = await this.productRepository.setPublished(
        client,
        id,
        true,
      );

      return published ? { ...published, variants } : null;
    });

    if (!product) {
      return null;
    }

    await this.cache.clear();

    return { product: await this.withPln(product), warnings: this.getWarnings(product) };
  }

  async unpublishProduct(id: number): Promise<PricedProductDetails | null> {
    const product = await this.inTransaction(async (client) => {
      const unpublished = await this.productRepository.setPublished(
        client,
        id,
        false,
      );

      if (!unpublished) {
        return null;
      }

      const variants = await this.productVariantRepository.findByProductId(
        client,
        id,
      );

      return { ...unpublished, variants };
    });

    if (!product) {
      return null;
    }

    await this.cache.clear();

    return this.withPln(product);
  }

  /**
   * Szkic, którego nikt nie zamówił, usuwamy trwale razem z plikami.
   * Produkt opublikowany (albo z zamówieniami) usuwamy miękko, bo mogą się do niego odwoływać zamówienia.
   */
  async deleteProduct(id: number): Promise<boolean> {
    const result = await this.inTransaction(async (client) => {
      const product = await this.productRepository.findById(id, client);

      if (!product) {
        return null;
      }

      if (product.isPublished || (await this.productRepository.hasOrders(client, id))) {
        return (await this.productRepository.delete(client, id))
          ? { mediaUrls: [] as string[] }
          : null;
      }

      const mediaUrls = await this.productRepository.findMediaUrls(client, id);

      return (await this.productRepository.hardDelete(client, id))
        ? { mediaUrls }
        : null;
    });

    if (!result) {
      return false;
    }

    await this.deleteFiles(result.mediaUrls);
    await this.cache.clear();

    return true;
  }

  /** Ostrzeżenia typu produktu (np. `missing_preview`), które nie blokują publikacji. */
  getWarnings(product: ProductDetails): string[] {
    return getProductType(product.type)?.warnings?.(product) ?? [];
  }

  // ------------------------------------------------------------------
  // Warianty
  // ------------------------------------------------------------------

  async createVariant(
    productId: number,
    data: CreateProductVariantInput,
  ): Promise<PricedProductVariant | null> {
    const variant = await this.inTransaction(async (client) => {
      const product = await this.productRepository.findById(productId, client);

      if (!product) {
        return null;
      }

      const type = this.getType(product.type);

      return this.createVariantWithPhotos(
        client,
        productId,
        {
          ...data,
          attributes: this.parseAttributes(
            type.variantAttributes,
            data.attributes,
            "attributes",
          ),
        },
        "",
      );
    });

    if (!variant) {
      return null;
    }

    await this.cache.clear();

    return this.variantWithPln(variant);
  }

  async updateVariant(
    productId: number,
    variantId: number,
    data: UpdateProductVariantData,
  ): Promise<PricedProductVariant | null> {
    const variant = await this.inTransaction(async (client) => {
      const product = await this.productRepository.findById(productId, client);
      const existing = await this.productVariantRepository.findById(
        client,
        variantId,
      );

      if (!product || !existing || existing.productId !== productId) {
        return null;
      }

      const type = this.getType(product.type);

      await this.productVariantRepository.update(client, variantId, {
        priceEur: data.priceEur,
        quantity: data.quantity,
        attributes:
          data.attributes === undefined
            ? undefined
            : this.parseAttributes(
                type.variantAttributes,
                data.attributes,
                "attributes",
              ),
      });

      // Ponowny odczyt zwraca wariant razem z mediami.
      return this.productVariantRepository.findById(client, variantId);
    });

    if (!variant) {
      return null;
    }

    await this.cache.clear();

    return this.variantWithPln(variant);
  }

  /** Wariant szkicu bez zamówień usuwamy trwale razem z plikami, w pozostałych przypadkach miękko. */
  async deleteProductVariant(
    productId: number,
    variantId: number,
  ): Promise<boolean> {
    const result = await this.inTransaction(async (client) => {
      const variant = await this.productVariantRepository.findById(
        client,
        variantId,
      );

      if (!variant || variant.productId !== productId) {
        return null;
      }

      const product = await this.productRepository.findById(productId, client);

      if (
        !product ||
        product.isPublished ||
        (await this.productVariantRepository.hasOrders(client, variantId))
      ) {
        return (await this.productVariantRepository.delete(client, variantId))
          ? { mediaUrls: [] as string[] }
          : null;
      }

      const mediaUrls = await this.productVariantRepository.findMediaUrls(
        client,
        variantId,
      );

      return (await this.productVariantRepository.hardDelete(client, variantId))
        ? { mediaUrls }
        : null;
    });

    if (!result) {
      return false;
    }

    await this.deleteFiles(result.mediaUrls);
    await this.cache.clear();

    return true;
  }

  // ------------------------------------------------------------------
  // Pomocnicze
  // ------------------------------------------------------------------

  private async withClient<T>(
    work: (client: Awaited<ReturnType<Database["connect"]>>) => Promise<T>,
  ): Promise<T> {
    const client = await this.pool.connect();

    try {
      return await work(client);
    } finally {
      client.release();
    }
  }

  /** BEGIN/COMMIT wokół `work`; `null` z `work` oznacza „nie znaleziono” i kończy się ROLLBACK. */
  private async inTransaction<T>(
    work: (client: Awaited<ReturnType<Database["connect"]>>) => Promise<T | null>,
  ): Promise<T | null> {
    return this.withClient(async (client) => {
      await client.query("BEGIN");

      try {
        const result = await work(client);

        await client.query(result === null ? "ROLLBACK" : "COMMIT");

        return result;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    });
  }

  /**
   * Tworzy wariant i podpina zdjęcia zapisane przy rozpoznawaniu płyty: pierwsze jako główne, kolejne po nim.
   * Nieznane albo już użyte identyfikatory kończą się błędem walidacji (cała transakcja jest wycofywana).
   */
  private async createVariantWithPhotos(
    client: Awaited<ReturnType<Database["connect"]>>,
    productId: number,
    data: CreateProductVariantInput,
    path: string,
  ): Promise<ProductVariant> {
    const variant = await this.productVariantRepository.create(client, {
      productId,
      priceEur: data.priceEur,
      quantity: data.quantity,
      attributes: data.attributes,
    });

    const ids = data.photoUploadIds ?? [];

    if (ids.length === 0) {
      return variant;
    }

    const uploads = await this.pendingUploads.claim(client, ids);

    if (uploads.length !== new Set(ids).size || uploads.length !== ids.length) {
      throw new ValidationError("Invalid product data", [
        {
          path: path ? `${path}.photoUploadIds` : "photoUploadIds",
          message: "Unknown, expired or already used photo upload",
        },
      ]);
    }

    for (const [index, upload] of uploads.entries()) {
      variant.media.push(
        await this.productVariantMediaRepository.create(
          client,
          variant.id,
          ProductVariantMediaType.PHOTO,
          upload.path,
          null,
          index,
          index === 0,
        ),
      );
    }

    return variant;
  }

  private async deleteFiles(urls: string[]): Promise<void> {
    for (const url of urls) {
      try {
        await this.storage.delete(url);
      } catch (error) {
        console.error(`Failed to delete media file "${url}":`, error);
      }
    }
  }

  private async withPln(product: ProductDetails): Promise<PricedProductDetails> {
    return this.withRate(product, await this.exchangeRates.getEurPlnRate());
  }

  private async variantWithPln(
    variant: ProductVariant,
  ): Promise<PricedProductVariant> {
    const rate = await this.exchangeRates.getEurPlnRate();

    return {
      ...variant,
      pricePln: rate === null ? null : convertEurToPln(variant.priceEur, rate),
    };
  }

  private withRate(
    product: ProductDetails,
    rate: number | null,
  ): PricedProductDetails {
    return {
      ...product,
      variants: product.variants.map((variant) => ({
        ...variant,
        pricePln: rate === null ? null : convertEurToPln(variant.priceEur, rate),
      })),
    };
  }

  private buildListCacheKey(query: ProductListQuery): string {
    const params = Object.entries(query)
      .filter(([, value]) => value !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${String(value)}`);

    return `products:list:${params.join(":")}`;
  }

  private getType(key: string): ProductTypeDefinition {
    const type = getProductType(key);

    if (!type) {
      throw new ValidationError("Invalid product data", [
        { path: "type", message: "Unknown product type" },
      ]);
    }

    return type;
  }

  private parseAttributes(
    schema: ProductTypeDefinition["productAttributes"],
    attributes: Record<string, unknown>,
    path: string,
  ): Record<string, unknown> {
    const result = schema.safeParse(attributes);

    if (!result.success) {
      throw new ValidationError(
        "Invalid product data",
        formatZodIssues(result.error).map((issue) => ({
          ...issue,
          path: issue.path ? `${path}.${issue.path}` : path,
        })),
      );
    }

    return result.data;
  }

  private buildSlugBase(
    type: ProductTypeDefinition,
    title: string,
    attributes: Record<string, unknown>,
  ): string {
    const parts = [...(type.slugParts?.(attributes) ?? []), title];

    return slugify(parts.join(" ")) || "product";
  }
}
