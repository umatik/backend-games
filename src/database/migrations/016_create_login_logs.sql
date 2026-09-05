CREATE TABLE login_logs
(
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER      NULL,
    email      VARCHAR(255) NOT NULL,
    success    BOOLEAN      NOT NULL,
    ip_address VARCHAR(45)  NULL,
    user_agent TEXT         NULL,
    created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_login_logs_user
        FOREIGN KEY (user_id)
            REFERENCES users (id)
            ON DELETE SET NULL
);