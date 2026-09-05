ALTER TABLE products
    ADD CONSTRAINT products_price_check CHECK (price >= 0);