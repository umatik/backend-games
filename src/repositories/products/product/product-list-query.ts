import type {
  ProductListQuery,
  ProductSort,
  ProductStatus,
} from "@/types/product.types.js";

export type ProductWhere = {
  sql: string;
  values: unknown[];
};

const escapeLike = (text: string): string => text.replace(/[\\%_]/g, (char) => `\\${char}`);

/**
 * Buduje warunek WHERE listy produktów (alias tabeli: `p`). Warunki wariantu (format, stan, wytwórnia, cena,
 * dostępność) muszą być spełnione przez TEN SAM wariant.
 */
export const buildProductWhere = (
  query: Omit<ProductListQuery, "page" | "limit" | "sort">,
  startIndex = 1,
): ProductWhere => {
  const conditions = ["p.is_deleted = FALSE"];
  const values: unknown[] = [];
  const param = (value: unknown): string => {
    values.push(value);
    return `$${startIndex + values.length - 1}`;
  };

  const statusCondition: Record<ProductStatus, string | null> = {
    published: "p.is_published = TRUE",
    draft: "p.is_published = FALSE",
    all: null,
  };

  const status = statusCondition[query.status];

  if (status) {
    conditions.push(status);
  }

  if (query.type !== undefined) {
    conditions.push(`p.type = ${param(query.type)}`);
  }

  if (query.artist !== undefined) {
    conditions.push(`EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(p.attributes -> 'artists') AS artist(name)
      WHERE lower(artist.name) = lower(${param(query.artist)})
    )`);
  }

  const variantConditions: string[] = [];

  if (query.format !== undefined) {
    variantConditions.push(`pv.attributes ->> 'format' = ${param(query.format)}`);
  }

  if (query.mediaCondition !== undefined) {
    variantConditions.push(
      `pv.attributes ->> 'mediaCondition' = ${param(query.mediaCondition)}`,
    );
  }

  if (query.label !== undefined) {
    variantConditions.push(
      `lower(pv.attributes ->> 'label') = lower(${param(query.label)})`,
    );
  }

  if (query.priceMinEur !== undefined) {
    variantConditions.push(`pv.price_eur >= ${param(query.priceMinEur)}`);
  }

  if (query.priceMaxEur !== undefined) {
    variantConditions.push(`pv.price_eur <= ${param(query.priceMaxEur)}`);
  }

  if (query.available) {
    variantConditions.push("pv.quantity > 0");
  }

  if (variantConditions.length > 0) {
    conditions.push(`EXISTS (
      SELECT 1
      FROM product_variants pv
      WHERE pv.product_id = p.id
        AND pv.is_deleted = FALSE
        AND ${variantConditions.join("\n        AND ")}
    )`);
  }

  if (query.q !== undefined) {
    const pattern = param(`%${escapeLike(query.q)}%`);

    conditions.push(`(
      p.title ILIKE ${pattern}
      OR (p.attributes ->> 'artists') ILIKE ${pattern}
      OR EXISTS (
        SELECT 1
        FROM product_variants pv
        WHERE pv.product_id = p.id
          AND pv.is_deleted = FALSE
          AND (
            (pv.attributes ->> 'label') ILIKE ${pattern}
            OR (pv.attributes ->> 'catalogNumber') ILIKE ${pattern}
          )
      )
    )`);
  }

  return { sql: conditions.join("\n  AND "), values };
};

/** Kolumny pomocnicze do sortowania, liczone w podzapytaniu listy. */
export const SORT_COLUMNS = `
  (
    SELECT MIN(pv.price_eur)
    FROM product_variants pv
    WHERE pv.product_id = p.id
      AND pv.is_deleted = FALSE
  ) AS "sortPrice",
  lower(p.attributes -> 'artists' ->> 0) AS "sortArtist"
`;

/** ORDER BY dla listy; `prefix` wskazuje, skąd brać kolumny (podzapytanie lub zapytanie zewnętrzne). */
export const buildProductOrderBy = (sort: ProductSort, prefix: string): string => {
  const column = (name: string) => (prefix ? `${prefix}."${name}"` : `"${name}"`);
  const id = prefix ? `${prefix}.id` : "id";
  const createdAt = column("createdAt");

  switch (sort) {
    case "price_asc":
      return `${column("sortPrice")} ASC NULLS LAST, ${id} DESC`;
    case "price_desc":
      return `${column("sortPrice")} DESC NULLS LAST, ${id} DESC`;
    case "artist":
      return `${column("sortArtist")} ASC NULLS LAST, ${prefix ? `${prefix}.title` : "title"} ASC, ${id} DESC`;
    case "newest":
      return `${createdAt} DESC, ${id} DESC`;
  }
};
