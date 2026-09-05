ALTER TABLE products
    ADD COLUMN stock INTEGER NOT NULL DEFAULT 0;

ALTER TABLE products
    ADD CONSTRAINT products_stock_check
        CHECK (stock >= 0);