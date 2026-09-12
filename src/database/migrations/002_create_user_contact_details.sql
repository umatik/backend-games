CREATE TABLE user_contact_details
(
    user_id     BIGINT PRIMARY KEY,
    first_name  VARCHAR(100) NOT NULL,
    last_name   VARCHAR(100) NOT NULL,
    phone       VARCHAR(50),
    address     TEXT,
    city        VARCHAR(100),
    postal_code VARCHAR(20),
    country     VARCHAR(100),
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_contact_details_user
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
