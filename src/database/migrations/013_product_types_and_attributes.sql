-- Model pod sklep z płytami: typy produktów zdefiniowane w kodzie (src/product-types/),
-- pola zależne od typu w kolumnach `attributes` (JSONB), ceny w eurocentach.

-- ============================================================
-- PRODUCTS
-- ============================================================

ALTER TABLE products
  RENAME COLUMN name TO title;

ALTER TABLE products
  ADD COLUMN type         VARCHAR(50),
  ADD COLUMN slug         VARCHAR(320),
  ADD COLUMN description  TEXT,
  ADD COLUMN is_published BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN attributes   JSONB   NOT NULL DEFAULT '{}'::jsonb;

-- Istniejące produkty (kolor/rozmiar) przechodzą na typ „other”, który nie ma wymaganych pól,
-- i zostają opublikowane, bo przed tą migracją były widoczne w sklepie.
UPDATE products
SET type         = 'other',
    slug         = 'product-' || id,
    is_published = TRUE;

ALTER TABLE products
  ALTER COLUMN type SET NOT NULL,
  ALTER COLUMN slug SET NOT NULL,
  ADD CONSTRAINT chk_products_attributes_object CHECK (jsonb_typeof(attributes) = 'object');

CREATE UNIQUE INDEX uq_products_slug ON products (slug);
CREATE INDEX idx_products_type ON products (type);
CREATE INDEX idx_products_attributes ON products USING GIN (attributes);

-- ============================================================
-- PRODUCT VARIANTS
-- ============================================================

ALTER TABLE product_variants
  ADD COLUMN price_eur  INTEGER,
  ADD COLUMN attributes JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE product_variants
SET price_eur  = ROUND(price * 100)::INTEGER,
    attributes = CASE
                   WHEN color IS NULL AND size IS NULL THEN '{}'::jsonb
                   ELSE jsonb_build_object('details', concat_ws(' / ', color, size))
      END;

ALTER TABLE product_variants
  ALTER COLUMN price_eur SET NOT NULL,
  ALTER COLUMN quantity SET DEFAULT 1,
  DROP CONSTRAINT chk_product_variants_price,
  DROP COLUMN price,
  DROP COLUMN color,
  DROP COLUMN size,
  ADD CONSTRAINT chk_product_variants_price_eur CHECK (price_eur >= 0),
  ADD CONSTRAINT chk_product_variants_attributes_object CHECK (jsonb_typeof(attributes) = 'object');

CREATE INDEX idx_product_variants_attributes ON product_variants USING GIN (attributes);

-- ============================================================
-- ORDER ITEMS
-- ============================================================

ALTER TABLE order_items
  ADD COLUMN price_eur INTEGER;

UPDATE order_items
SET price_eur = ROUND(price * 100)::INTEGER;

ALTER TABLE order_items
  ALTER COLUMN price_eur SET NOT NULL,
  DROP CONSTRAINT chk_order_items_price,
  DROP COLUMN price,
  ADD CONSTRAINT chk_order_items_price_eur CHECK (price_eur >= 0);
