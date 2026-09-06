CREATE TABLE product_variants
(
    id         SERIAL PRIMARY KEY,

    product_id INTEGER        NOT NULL,

    sku        VARCHAR(100)   NOT NULL,

    color      VARCHAR(100),
    size       VARCHAR(50),

    price      NUMERIC(10, 2) NOT NULL,

    created_at TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_product_variants_product
        FOREIGN KEY (product_id)
            REFERENCES products (id)
            ON DELETE CASCADE,

    CONSTRAINT product_variants_price_check
        CHECK (price >= 0),

    CONSTRAINT product_variants_sku_unique
        UNIQUE (sku)
);