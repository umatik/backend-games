import type {
  CreateProductVariantInput,
  ProductVariant,
} from "./product-variant.types.js";

export type Product = {
  id: number;
  /** Klucz typu z rejestru `src/product-types/`. */
  type: string;
  title: string;
  slug: string;
  description: string | null;
  isPublished: boolean;
  /** Pola zależne od typu produktu, zob. `src/product-types/`. */
  attributes: Record<string, unknown>;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type ProductDetails = Product & {
  variants: ProductVariant[];
};

export type CreateProductData = {
  type: string;
  title: string;
  description?: string | null | undefined;
  attributes: Record<string, unknown>;
  variants: CreateProductVariantInput[];
};

export type CreateProductRecord = {
  type: string;
  title: string;
  description: string | null;
  attributes: Record<string, unknown>;
  /** Początek sluga; repozytorium dokleja `-{id}`, co gwarantuje unikalność. */
  slugBase: string;
};

export type UpdateProductData = {
  title?: string | undefined;
  description?: string | null | undefined;
  attributes?: Record<string, unknown> | undefined;
};

export type UpdateProductRecord = UpdateProductData;

/** Wariant w odpowiedzi API: cena w EUR z bazy i przeliczona cena w PLN (grosze; `null`, gdy brak kursu). */
export type PricedProductVariant = ProductVariant & {
  pricePln: number | null;
};

export type PricedProductDetails = Product & {
  variants: PricedProductVariant[];
};

/** Który zestaw produktów zwracać: sklep widzi tylko opublikowane, admin także szkice. */
export type ProductStatus = "published" | "draft" | "all";

export const PRODUCT_SORTS = ["newest", "price_asc", "price_desc", "artist"] as const;

export type ProductSort = (typeof PRODUCT_SORTS)[number];

export type ProductListFilters = {
  type?: string | undefined;
  artist?: string | undefined;
  format?: string | undefined;
  mediaCondition?: string | undefined;
  label?: string | undefined;
  /** Zakres cen w eurocentach; wariant musi się w nim mieścić. */
  priceMinEur?: number | undefined;
  priceMaxEur?: number | undefined;
  /** Tylko produkty, które mają wariant na stanie. */
  available?: boolean | undefined;
  /** Wyszukiwanie po tytule, artystach, wytwórni i numerze katalogowym. */
  q?: string | undefined;
};

export type ProductListQuery = ProductListFilters & {
  page: number;
  limit: number;
  status: ProductStatus;
  sort: ProductSort;
};

/** Kryteria szukania produktu, do którego pasuje dodawana płyta (wykrywanie duplikatów w kreatorze). */
export type ProductMatchCriteria = {
  discogsReleaseId?: number | undefined;
  catalogNumber?: string | undefined;
  label?: string | undefined;
  title?: string | undefined;
  artists?: string[] | undefined;
};

export type ProductMatchReason = "discogs_release" | "catalog_number" | "title_artist";

/**
 * Istniejący produkt, do którego można dodać nowy wariant zamiast tworzyć kolejny produkt.
 * `matchingVariantIds`: warianty tego samego tłoczenia (ID z Discogs albo numer katalogowy), np. żeby
 * zwiększyć ilość, gdy stan jest taki sam.
 */
export type ProductMatch = {
  productId: number;
  type: string;
  title: string;
  artists: string[];
  isPublished: boolean;
  matchedBy: ProductMatchReason[];
  matchingVariantIds: number[];
};
