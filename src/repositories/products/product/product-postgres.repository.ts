import type {
  CreateProductRecord,
  Product,
  ProductDetails,
  UpdateProductRecord,
} from "@/types/product.types.js";
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

  async findById(id: number, client: PoolClient): Promise<Product | null> {
    const result = await client.query<Product>(
      `
        SELECT ${PRODUCT_COLUMNS}
        FROM products
        WHERE id = $1
          AND is_deleted = FALSE
      `,
      [id],
    );

    const row = result.rows[0];

    return row ? this.mapProductRow(row) : null;
  }

  async findAllWithVariants(
    client: PoolClient,
    page: number,
    limit: number,
  ): Promise<ProductDetails[]> {
    const offset = (page - 1) * limit;

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
               SELECT ${PRODUCT_COLUMNS}
               FROM products
               WHERE is_deleted = FALSE
               ORDER BY id
               LIMIT $1 OFFSET $2
             ) p
               LEFT JOIN product_variants pv
                         ON pv.product_id = p.id
                           AND pv.is_deleted = FALSE
               LEFT JOIN product_variant_media pvm
                         ON pvm.product_variant_id = pv.id
        ORDER BY p.id, pv.id, pvm.sort_order, pvm.id
      `,
      [limit, offset],
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

  async countAll(client: PoolClient): Promise<number> {
    const result = await client.query(
      `
        SELECT COUNT(*) AS total
        FROM products
        WHERE is_deleted = FALSE
      `,
    );

    return Number(result.rows[0].total);
  }
}
