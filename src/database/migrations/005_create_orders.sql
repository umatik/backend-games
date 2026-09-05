CREATE TABLE orders
(
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER     NOT NULL,
    status     VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_orders_user
        FOREIGN KEY (user_id)
            REFERENCES users (id)
);