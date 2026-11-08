import type { z } from "zod";
import type { ProductDetails } from "@/types/product.types.js";

/**
 * Kontrakt typu produktu.
 *
 * Każdy typ (winyl, koszulka, …) to osobny plik w `src/product-types/`, który eksportuje obiekt spełniający ten
 * interfejs, oraz jeden wpis w rejestrze (`index.ts`). Pola zależne od typu trafiają do kolumny `attributes` (JSONB)
 * produktu i wariantu, a ich kształt opisują schematy zod poniżej. Dzięki temu nowy typ nie wymaga migracji.
 *
 * Struktura jest celowo otwarta: nowe możliwości typów dodajemy jako kolejne, opcjonalne pola tego interfejsu, bez
 * przepisywania istniejących typów.
 */
export interface ProductTypeDefinition {
  /** Stały identyfikator zapisywany w `products.type`. */
  readonly key: string;

  /** Schemat `products.attributes` dla tego typu. */
  readonly productAttributes: z.ZodType<Record<string, unknown>>;

  /** Schemat `product_variants.attributes` dla tego typu. */
  readonly variantAttributes: z.ZodType<Record<string, unknown>>;

  /**
   * Dodatkowe teksty, z których (razem z tytułem) budowany jest slug, np. artyści płyty.
   * Dostaje atrybuty produktu już po walidacji.
   */
  readonly slugParts?: (attributes: Record<string, unknown>) => string[];

  /**
   * Ostrzeżenia, które nie blokują publikacji, ale warto je pokazać w podsumowaniu kreatora,
   * np. `missing_preview` dla płyty bez odsłuchu.
   */
  readonly warnings?: (product: ProductDetails) => string[];
}
