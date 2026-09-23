CREATE TABLE order_items
(
  id                 BIGSERIAL PRIMARY KEY,
  order_id           BIGINT         NOT NULL,
  product_variant_id BIGINT         NOT NULL,
  quantity           INTEGER        NOT NULL,
  price              NUMERIC(10, 2) NOT NULL,

  CONSTRAINT fk_order_items_order
    FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,

  CONSTRAINT fk_order_items_product_variant
    FOREIGN KEY (product_variant_id) REFERENCES product_variants (id) ON DELETE CASCADE,

  CONSTRAINT chk_order_items_quantity
    CHECK (quantity > 0),

  CONSTRAINT chk_order_items_price
    CHECK (price >= 0)
);

CREATE INDEX idx_order_items_order_id
  ON order_items (order_id);

CREATE INDEX idx_order_items_product_variant_id
  ON order_items (product_variant_id);

CREATE INDEX idx_order_items_order_id
  ON order_items (order_id);

CREATE INDEX idx_order_items_product_variant_id
  ON order_items (product_variant_id);