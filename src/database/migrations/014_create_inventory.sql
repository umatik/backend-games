CREATE TABLE inventory
(
    product_id INTEGER PRIMARY KEY,
    quantity   INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT fk_inventory_product
        FOREIGN KEY (product_id)
            REFERENCES products (id),

    CONSTRAINT inventory_quantity_check
        CHECK (quantity >= 0)
);