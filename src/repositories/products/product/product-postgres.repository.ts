import type {
  CreateProductRecord,
  Product,
  ProductDetails,
  ProductListQuery,
  ProductMatch,
  ProductStatus,
  UpdateProductRecord,
} from "@/types/product.types.js";
import {
  buildProductOrderBy,
  buildProductWhere,
  SORT_COLUMNS,
} from "./product-list-query.js";
import type { PoolClient } from "pg";
import type { ProductRepository } from "./product.interface.js";
import type { ProductVariantMediaType } from "@/types/product-variant-media.types.js";

const PRODUCT_COLUMNS = `
  id,
  type,
  title,
  slug,
  description,
  is_published AS "isPublished",
  attributes,
  is_deleted   AS "isDeleted",
  created_at   AS "createdAt",
  updated_at   AS "updatedAt",
  deleted_at   AS "deletedAt"
`;

type ProductDetailsRow = Product & {
  variantId: number | null;
  variantPriceEur: number | null;
  variantQuantity: number | null;
  variantAttributes: Record<string, unknown> | null;
  variantIsDeleted: boolean | null;
  variantCreatedAt: Date | null;
  variantUpdatedAt: Date | null;
  variantDeletedAt: Date | null;
  mediaId: number | null;
  mediaType: ProductVariantMediaType | null;
  mediaUrl: string | null;
  mediaAlt: string | null;
  mediaSortOrder: number | null;
  mediaIsPrimary: boolean | null;
  mediaCreatedAt: Date | null;
  mediaUpdatedAt: Date | null;
};

export class PostgresProductRepository implements ProductRepository {
  private mapProductRow = (row: Product): Product => ({
    id: Number(row.id),
    type: row.type,
    title: row.title,
    slug: row.slug,
    description: row.description,
    isPublished: row.isPublished,
    attributes: row.attributes,
    isDeleted: row.isDeleted,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  });

  private mapProductDetailsRows = (
    rows: ProductDetailsRow[],
  ): ProductDetails[] => {
    const products = new Map<number, ProductDetails>();

    for (const row of rows) {
      const productId = Number(row.id);

      let product = products.get(productId);

      if (!product) {
        product = { ...this.mapProductRow(row), variants: [] };
        products.set(productId, product);
      }

      if (row.variantId === null) {
        continue;
      }

      const variantId = Number(row.variantId);
      let variant = product.variants.find((item) => item.id === variantId);

      if (!variant) {
        variant = {
          id: variantId,
          productId,
          priceEur: Number(row.variantPriceEur),
          quantity: Number(row.variantQuantity),
          attributes: row.variantAttributes ?? {},
          media: [],
          isDeleted: row.variantIsDeleted!,
          createdAt: row.variantCreatedAt!,
          updatedAt: row.variantUpdatedAt!,
          deletedAt: row.variantDeletedAt,
        };

        product.variants.push(variant);
      }

      if (row.mediaId !== null) {
        variant.media.push({
          id: Number(row.mediaId),
          productVariantId: variantId,
          type: row.mediaType!,
          url: row.mediaUrl!,
          alt: row.mediaAlt,
          sortOrder: row.mediaSortOrder!,
          isPrimary: row.mediaIsPrimary!,
          createdAt: row.mediaCreatedAt!,
          updatedAt: row.mediaUpdatedAt!,
        });
      }
    }

    return Array.from(products.values());
  };

  async create(
    client: PoolClient,
    data: CreateProductRecord,
  ): Promise<Product> {
    // Id pobieramy z sekwencji w tym samym zapytaniu, żeby dokleić je do sluga (gwarancja unikalności).
    const result = await client.query<Product>(
      `
        INSERT INTO products (id, type, title, slug, description, attributes)
        SELECT next.id, $1::varchar, $2::varchar, $3::text || '-' || next.id, $4::text, $5::jsonb
        FROM (SELECT nextval(pg_get_serial_sequence('products', 'id')) AS id) next
        RETURNING ${PRODUCT_COLUMNS}
      `,
      [data.type, data.title, data.slugBase, data.description, data.attributes],
    );

    const row = result.rows[0];

    if (!row) {
      throw new Error("Product was not created");
    }

    return this.mapProductRow(row);
  }

  async findById(
    id: number,
    client: PoolClient,
    status: ProductStatus = "all",
  ): Promise<Product | null> {
    const where = buildProductWhere({ status }, 2);

    const result = await client.query<Product>(
      `
        SELECT ${PRODUCT_COLUMNS}
        FROM products p
        WHERE p.id = $1
          AND ${where.sql}
      `,
      [id, ...where.values],
    );

    const row = result.rows[0];

    return row ? this.mapProductRow(row) : null;
  }

  async findAllWithVariants(
    client: PoolClient,
    query: ProductListQuery,
  ): Promise<ProductDetails[]> {
    const where = buildProductWhere(query);
    const limitIndex = where.values.length + 1;

    const result = await client.query<ProductDetailsRow>(
      `
        SELECT p.*,
               pv.id          AS "variantId",
               pv.price_eur   AS "variantPriceEur",
               pv.quantity    AS "variantQuantity",
               pv.attributes  AS "variantAttributes",
               pv.is_deleted  AS "variantIsDeleted",
               pv.created_at  AS "variantCreatedAt",
               pv.updated_at  AS "variantUpdatedAt",
               pv.deleted_at  AS "variantDeletedAt",
               pvm.id         AS "mediaId",
               pvm.type       AS "mediaType",
               pvm.url        AS "mediaUrl",
               pvm.alt        AS "mediaAlt",
               pvm.sort_order AS "mediaSortOrder",
               pvm.is_primary AS "mediaIsPrimary",
               pvm.created_at AS "mediaCreatedAt",
               pvm.updated_at AS "mediaUpdatedAt"
        FROM (
               SELECT ${PRODUCT_COLUMNS},
                      ${SORT_COLUMNS}
               FROM products p
               WHERE ${where.sql}
               ORDER BY ${buildProductOrderBy(query.sort, "")}
               LIMIT $${limitIndex} OFFSET $${limitIndex + 1}
             ) p
               LEFT JOIN product_variants pv
                         ON pv.product_id = p.id
                           AND pv.is_deleted = FALSE
               LEFT JOIN product_variant_media pvm
                         ON pvm.product_variant_id = pv.id
        ORDER BY ${buildProductOrderBy(query.sort, "p")}, pv.id, pvm.sort_order, pvm.id
      `,
      [...where.values, query.limit, (query.page - 1) * query.limit],
    );

    return this.mapProductDetailsRows(result.rows);
  }

  async update(
    client: PoolClient,
    id: number,
    data: UpdateProductRecord,
  ): Promise<Product | null> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.title !== undefined) {
      values.push(data.title);
      fields.push(`title = $${values.length}`);
    }

    if (data.description !== undefined) {
      values.push(data.description);
      fields.push(`description = $${values.length}`);
    }

    if (data.attributes !== undefined) {
      values.push(data.attributes);
      fields.push(`attributes = $${values.length}`);
    }

    if (fields.length === 0) {
      return this.findById(id, client);
    }

    fields.push("updated_at = NOW()");
    values.push(id);

    const result = await client.query<Product>(
      `
        UPDATE products
        SET ${fields.join(", ")}
        WHERE id = $${values.length}
          AND is_deleted = FALSE
        RETURNING ${PRODUCT_COLUMNS}
      `,
      values,
    );

    const row = result.rows[0];

    return row ? this.mapProductRow(row) : null;
  }

  async delete(client: PoolClient, id: number): Promise<boolean> {
    const result = await client.query(
      `
        UPDATE products
        SET is_deleted = TRUE,
            deleted_at = NOW(),
            updated_at = NOW()
        WHERE id = $1
          AND is_deleted = FALSE
        RETURNING id
      `,
      [id],
    );

    return result.rows.length > 0;
  }

  async countAll(
    client: PoolClient,
    query: Omit<ProductListQuery, "page" | "limit" | "sort">,
  ): Promise<number> {
    const where = buildProductWhere(query);

    const result = await client.query(
      `
        SELECT COUNT(*) AS total
        FROM products p
        WHERE ${where.sql}
      `,
      where.values,
    );

    return Number(result.rows[0].total);
  }

  async setPublished(
    client: PoolClient,
    id: number,
    isPublished: boolean,
  ): Promise<Product | null> {
    const result = await client.query<Product>(
      `
        UPDATE products
        SET is_published = $1,
            updated_at   = NOW()
        WHERE id = $2
          AND is_deleted = FALSE
        RETURNING ${PRODUCT_COLUMNS}
      `,
      [isPublished, id],
    );

    const row = result.rows[0];

    return row ? this.mapProductRow(row) : null;
  }

  async hasOrders(client: PoolClient, id: number): Promise<boolean> {
    const result = await client.query(
      `
        SELECT EXISTS (
          SELECT 1
          FROM order_items oi
                 JOIN product_variants pv ON pv.id = oi.product_variant_id
          WHERE pv.product_id = $1
        ) AS "hasOrders"
      `,
      [id],
    );

    return Boolean(result.rows[0].hasOrders);
  }

  async findMediaUrls(client: PoolClient, id: number): Promise<string[]> {
    const result = await client.query<{ url: string }>(
      `
        SELECT pvm.url
        FROM product_variant_media pvm
               JOIN product_variants pv ON pv.id = pvm.product_variant_id
        WHERE pv.product_id = $1
      `,
      [id],
    );

    return result.rows.map((row) => row.url);
  }

  async findMatching(
    client: PoolClient,
    criteria: {
      discogsReleaseId: string | null;
      catalogNumber: string | null;
      label: string | null;
      title: string | null;
      artists: string[] | null;
    },
    limit: number,
  ): Promise<ProductMatch[]> {
    const result = await client.query<{
      id: string;
      type: string;
      title: string;
      artists: unknown;
      isPublished: boolean;
      byRelease: string[];
      byCatalogNumber: string[];
      byTitle: boolean;
    }>(
      `
        WITH matches AS (
          SELECT p.id,
                 p.type,
                 p.title,
                 p.attributes -> 'artists' AS artists,
                 p.is_published AS "isPublished",
                 array_remove(array_agg(DISTINCT CASE
                   WHEN $1::text IS NOT NULL
                     AND pv.attributes ->> 'discogsReleaseId' = $1::text
                     THEN pv.id END), NULL) AS "byRelease",
                 array_remove(array_agg(DISTINCT CASE
                   WHEN $2::text IS NOT NULL
                     AND regexp_replace(lower(pv.attributes ->> 'catalogNumber'), '[^a-z0-9]', '', 'g') = $2::text
                     AND ($3::text IS NULL OR lower(trim(pv.attributes ->> 'label')) = $3::text)
                     THEN pv.id END), NULL) AS "byCatalogNumber",
                 (
                   $4::text IS NOT NULL
                     AND lower(trim(p.title)) = $4::text
                     AND (
                       $5::text[] IS NULL
                       OR EXISTS (
                         SELECT 1
                         FROM jsonb_array_elements_text(
                                CASE WHEN jsonb_typeof(p.attributes -> 'artists') = 'array'
                                       THEN p.attributes -> 'artists'
                                     ELSE '[]'::jsonb END
                              ) AS artist(name)
                         WHERE lower(trim(artist.name)) = ANY ($5::text[])
                       )
                     )
                 ) AS "byTitle"
          FROM products p
                 LEFT JOIN product_variants pv
                           ON pv.product_id = p.id
                             AND pv.is_deleted = FALSE
          WHERE p.is_deleted = FALSE
          GROUP BY p.id
        )
        SELECT *
        FROM matches
        WHERE cardinality("byRelease") > 0
           OR cardinality("byCatalogNumber") > 0
           OR "byTitle"
        ORDER BY cardinality("byRelease") > 0 DESC,
                 cardinality("byCatalogNumber") > 0 DESC,
                 id
        LIMIT $6
      `,
      [
        criteria.discogsReleaseId,
        criteria.catalogNumber,
        criteria.label,
        criteria.title,
        criteria.artists,
        limit,
      ],
    );

    return result.rows.map((row) => {
      const matchedBy: ProductMatch["matchedBy"] = [];

      if (row.byRelease.length > 0) matchedBy.push("discogs_release");
      if (row.byCatalogNumber.length > 0) matchedBy.push("catalog_number");
      if (row.byTitle) matchedBy.push("title_artist");

      return {
        productId: Number(row.id),
        type: row.type,
        title: row.title,
        artists: Array.isArray(row.artists) ? row.artists.map(String) : [],
        isPublished: row.isPublished,
        matchedBy,
        matchingVariantIds: [...new Set([...row.byRelease, ...row.byCatalogNumber])]
          .map(Number)
          .sort((a, b) => a - b),
      };
    });
  }

  async hardDelete(client: PoolClient, id: number): Promise<boolean> {
    // Warianty i media usuwa ON DELETE CASCADE.
    const result = await client.query(
      `
        DELETE FROM products
        WHERE id = $1
        RETURNING id
      `,
      [id],
    );

    return result.rows.length > 0;
  }
}
