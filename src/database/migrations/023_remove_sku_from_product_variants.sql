ALTER TABLE product_variants
    DROP CONSTRAINT product_variants_sku_unique;

ALTER TABLE product_variants
    DROP COLUMN sku;