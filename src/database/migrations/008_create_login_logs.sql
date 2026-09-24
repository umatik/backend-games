CREATE TABLE login_logs
(
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT       NULL,
  email      VARCHAR(255) NOT NULL,
  success    BOOLEAN      NOT NULL,
  ip_address VARCHAR(255),
  user_agent TEXT,
  created_at TIMESTAMPTZ    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_login_logs_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX idx_login_logs_user_id
  ON login_logs (user_id);