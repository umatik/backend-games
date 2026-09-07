ALTER TABLE product_variants
    ADD COLUMN quantity INTEGER NOT NULL DEFAULT 0
        CONSTRAINT product_variants_quantity_check CHECK (quantity >= 0);

UPDATE product_variants pv
SET quantity = i.quantity
FROM inventory i
WHERE i.product_variant_id = pv.id;

DROP TABLE inventory;