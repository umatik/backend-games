CREATE TABLE product_variants
(
    id           BIGSERIAL PRIMARY KEY,
    product_id   BIGINT         NOT NULL,
    color        VARCHAR(100),
    size         VARCHAR(100),
    price        NUMERIC(10, 2) NOT NULL,
    quantity     INTEGER        NOT NULL DEFAULT 0,
    is_deleted   BOOLEAN        NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at   TIMESTAMP      NULL,
    is_available BOOLEAN        NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_product_variants_product
        FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
);
