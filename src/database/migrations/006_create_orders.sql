CREATE TABLE orders
(
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT      NOT NULL,
  status     VARCHAR(50) NOT NULL,
  is_deleted BOOLEAN     NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ   NULL,
  created_at TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_orders_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_orders_user_id
  ON orders (user_id);