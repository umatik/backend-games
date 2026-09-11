CREATE TABLE permissions
(
    id   BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE role_permissions
(
    role_id       BIGINT NOT NULL,
    permission_id BIGINT NOT NULL,

    PRIMARY KEY (role_id, permission_id),

    CONSTRAINT fk_role_permissions_role
        FOREIGN KEY (role_id)
            REFERENCES roles (id)
            ON DELETE CASCADE,

    CONSTRAINT fk_role_permissions_permission
        FOREIGN KEY (permission_id)
            REFERENCES permissions (id)
            ON DELETE CASCADE
);

CREATE INDEX idx_role_permissions_permission_id
    ON role_permissions (permission_id);

INSERT INTO permissions (name)
VALUES ('products:read'),
       ('products:create'),
       ('products:update'),
       ('products:delete'),
       ('orders:read'),
       ('orders:create'),
       ('orders:update'),
       ('users:read'),
       ('users:update');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
         CROSS JOIN permissions p
WHERE r.name = 'user'
  AND p.name IN (
                 'products:read',
                 'orders:read',
                 'orders:create',
                 'users:read',
                 'users:update'
    );

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
         CROSS JOIN permissions p
WHERE r.name = 'admin';