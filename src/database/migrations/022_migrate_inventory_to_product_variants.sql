CREATE TEMP TABLE product_variant_migration
(
    product_id INTEGER PRIMARY KEY,
    variant_id INTEGER NOT NULL,
    quantity   INTEGER NOT NULL
);

INSERT INTO product_variants (product_id,
                              sku,
                              color,
                              size,
                              price)
SELECT p.id,
       'DEFAULT-' || p.id,
       NULL,
       NULL,
       p.price
FROM products p
ORDER BY p.id;

INSERT INTO product_variant_migration (product_id,
                                       variant_id,
                                       quantity)
SELECT pv.product_id,
       pv.id,
       i.quantity
FROM product_variants pv
         JOIN inventory i
              ON i.product_id = pv.product_id;

ALTER TABLE inventory
    ADD COLUMN product_variant_id INTEGER;

UPDATE inventory i
SET product_variant_id = m.variant_id
FROM product_variant_migration m
WHERE i.product_id = m.product_id;

ALTER TABLE inventory
    ALTER COLUMN product_variant_id SET NOT NULL;

ALTER TABLE inventory
    ADD CONSTRAINT fk_inventory_product_variant
        FOREIGN KEY (product_variant_id)
            REFERENCES product_variants (id);

ALTER TABLE inventory
    DROP CONSTRAINT fk_inventory_product;

ALTER TABLE inventory
    DROP CONSTRAINT inventory_pkey;

ALTER TABLE inventory
    ADD CONSTRAINT inventory_pkey
        PRIMARY KEY (product_variant_id);

ALTER TABLE inventory
    DROP COLUMN product_id;

DROP TABLE product_variant_migration;