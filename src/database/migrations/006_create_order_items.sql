CREATE TABLE order_items
(
    id                 BIGSERIAL PRIMARY KEY,
    order_id           BIGINT         NOT NULL,
    product_variant_id BIGINT         NOT NULL,
    quantity           INTEGER        NOT NULL,
    price              NUMERIC(10, 2) NOT NULL,

    CONSTRAINT fk_order_items_order
        FOREIGN KEY (order_id)
            REFERENCES orders (id),

    CONSTRAINT fk_order_items_product_variant
        FOREIGN KEY (product_variant_id)
            REFERENCES product_variants (id)
);