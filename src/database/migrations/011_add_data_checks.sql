ALTER TABLE products
    ADD CONSTRAINT products_name_check
        CHECK (length(trim(name)) > 0);

ALTER TABLE users
    ADD CONSTRAINT users_email_check
        CHECK (length(trim(email)) > 0),
    ADD CONSTRAINT users_password_hash_check
        CHECK (length(trim(password_hash)) > 0);

ALTER TABLE orders
    ADD CONSTRAINT orders_status_check
        CHECK (length(trim(status)) > 0);