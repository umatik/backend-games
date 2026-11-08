-- Ujednolicenie typów dat z resztą schematu (products, product_variant_media używają TIMESTAMPTZ).
-- Istniejące wartości są interpretowane w strefie czasowej sesji, tak jak zostały zapisane przez CURRENT_TIMESTAMP.
ALTER TABLE product_variants
  ALTER COLUMN created_at TYPE TIMESTAMPTZ,
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ,
  ALTER COLUMN deleted_at TYPE TIMESTAMPTZ;
