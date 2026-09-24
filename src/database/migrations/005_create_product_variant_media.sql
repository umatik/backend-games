CREATE TABLE product_variant_media
(
  id                 BIGSERIAL PRIMARY KEY,
  product_variant_id BIGINT        NOT NULL,
  type               VARCHAR(20)   NOT NULL,
  url                VARCHAR(2048) NOT NULL,
  alt                VARCHAR(255),
  sort_order         INTEGER       NOT NULL DEFAULT 0,
  is_primary         BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_product_variant_media_variant
    FOREIGN KEY (product_variant_id)
      REFERENCES product_variants (id)
      ON DELETE CASCADE,

  CONSTRAINT chk_product_variant_media_type
    CHECK (type IN ('photo', 'video', 'audio', 'document')),

  CONSTRAINT chk_product_variant_media_sort_order
    CHECK (sort_order >= 0)
);

CREATE INDEX idx_product_variant_media_variant_id
  ON product_variant_media (product_variant_id);

CREATE INDEX idx_product_variant_media_variant_sort
  ON product_variant_media (product_variant_id, sort_order);

CREATE UNIQUE INDEX uq_product_variant_media_primary
  ON product_variant_media (product_variant_id)
  WHERE is_primary = TRUE;
