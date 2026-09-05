CREATE TABLE order_items
(
    id         SERIAL PRIMARY KEY,
    order_id   INTEGER        NOT NULL,
    product_id INTEGER        NOT NULL,
    quantity   INTEGER        NOT NULL,
    price      NUMERIC(10, 2) NOT NULL,

    CONSTRAINT fk_order_items_order
        FOREIGN KEY (order_id)
            REFERENCES orders (id),

    CONSTRAINT fk_order_items_product
        FOREIGN KEY (product_id)
            REFERENCES products (id)
);