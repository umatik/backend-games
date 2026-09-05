ALTER TABLE order_items
    ADD CONSTRAINT order_items_price_check CHECK (price >= 0);