ALTER TABLE order_items
    DROP CONSTRAINT fk_order_items_product;

ALTER TABLE order_items
    RENAME COLUMN product_id TO product_variant_id;

ALTER TABLE order_items
    ADD CONSTRAINT fk_order_items_product_variant
        FOREIGN KEY (product_variant_id)
            REFERENCES product_variants (id);