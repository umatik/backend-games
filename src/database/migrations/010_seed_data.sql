-- ============================================================
-- ROLES
-- ============================================================

INSERT INTO roles (name)
VALUES ('user'),
       ('admin');

-- ============================================================
-- PERMISSIONS
-- ============================================================

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

-- Regular users get basic permissions.
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

-- Admin gets every permission.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
         CROSS JOIN permissions p
WHERE r.name = 'admin';

-- ============================================================
-- USERS
-- ============================================================

INSERT INTO users (email, password_hash)
VALUES ('alice@example.com', '$2b$10$qTJekDIdqZWyiBNhVbKWpOOIzB0tiT9SlIDS/GOnooz7IqIHws2j6'),
       ('bob@example.com', '$2b$10$qTJekDIdqZWyiBNhVbKWpOOIzB0tiT9SlIDS/GOnooz7IqIHws2j6'),
       ('charlie@example.com', '$2b$10$qTJekDIdqZWyiBNhVbKWpOOIzB0tiT9SlIDS/GOnooz7IqIHws2j6'),
       ('david@example.com', '$2b$10$qTJekDIdqZWyiBNhVbKWpOOIzB0tiT9SlIDS/GOnooz7IqIHws2j6'),
       ('emma@example.com', '$2b$10$qTJekDIdqZWyiBNhVbKWpOOIzB0tiT9SlIDS/GOnooz7IqIHws2j6'),
       ('frank@example.com', '$2b$10$qTJekDIdqZWyiBNhVbKWpOOIzB0tiT9SlIDS/GOnooz7IqIHws2j6'),
       ('grace@example.com', '$2b$10$qTJekDIdqZWyiBNhVbKWpOOIzB0tiT9SlIDS/GOnooz7IqIHws2j6'),
       ('henry@example.com', '$2b$10$qTJekDIdqZWyiBNhVbKWpOOIzB0tiT9SlIDS/GOnooz7IqIHws2j6'),
       ('irene@example.com', '$2b$10$qTJekDIdqZWyiBNhVbKWpOOIzB0tiT9SlIDS/GOnooz7IqIHws2j6'),
       ('jack@example.com', '$2b$10$qTJekDIdqZWyiBNhVbKWpOOIzB0tiT9SlIDS/GOnooz7IqIHws2j6');

-- All seeded users are regular users.
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
         CROSS JOIN roles r
WHERE r.name = 'user';

-- Make Bob an admin as well.
INSERT INTO user_roles (user_id, role_id)
SELECT 2, r.id
FROM roles r
WHERE r.name = 'admin';

-- ============================================================
-- USER CONTACT DETAILS
-- ============================================================

INSERT INTO user_contact_details
(user_id, first_name, last_name, phone, address, city, postal_code, country)
VALUES (1, 'Alice', 'Smith', '500000001', 'Main Street 1', 'Warsaw', '00-001', 'Poland'),
       (2, 'Bob', 'Johnson', '500000002', 'Main Street 2', 'Krakow', '30-001', 'Poland'),
       (3, 'Charlie', 'Brown', '500000003', 'Main Street 3', 'Gdansk', '80-001', 'Poland'),
       (4, 'David', 'Wilson', '500000004', 'Main Street 4', 'Wroclaw', '50-001', 'Poland'),
       (5, 'Emma', 'Taylor', '500000005', 'Main Street 5', 'Poznan', '60-001', 'Poland'),
       (6, 'Frank', 'Davis', '500000006', 'Main Street 6', 'Lodz', '90-001', 'Poland'),
       (7, 'Grace', 'Miller', '500000007', 'Main Street 7', 'Szczecin', '70-001', 'Poland'),
       (8, 'Henry', 'Moore', '500000008', 'Main Street 8', 'Lublin', '20-001', 'Poland'),
       (9, 'Irene', 'Anderson', '500000009', 'Main Street 9', 'Katowice', '40-001', 'Poland'),
       (10, 'Jack', 'Thomas', '500000010', 'Main Street 10', 'Opole', '45-001', 'Poland');

-- ============================================================
-- PRODUCTS
-- ============================================================

INSERT INTO products (name)
SELECT 'Product ' || gs
FROM generate_series(1, 100) AS gs;

-- ============================================================
-- PRODUCT VARIANTS
-- Deterministic stock and prices.
-- Each product gets 1–5 variants.
-- ============================================================

INSERT INTO product_variants
    (product_id, color, size, price, quantity)
SELECT p.id,
       CASE ((v.variant_number - 1) % 5)
           WHEN 0 THEN 'Black'
           WHEN 1 THEN 'White'
           WHEN 2 THEN 'Red'
           WHEN 3 THEN 'Blue'
           WHEN 4 THEN 'Green'
           END,
       CASE ((v.variant_number - 1) % 5)
           WHEN 0 THEN 'S'
           WHEN 1 THEN 'M'
           WHEN 2 THEN 'L'
           WHEN 3 THEN 'XL'
           WHEN 4 THEN 'XXL'
           END,
       (50 + (p.id * 10) + v.variant_number)::numeric(10, 2),
       100
FROM products p
         CROSS JOIN LATERAL generate_series(
        1,
        1 + ((p.id - 1) % 5)
                            ) AS v(variant_number);

-- ============================================================
-- ORDERS
-- Users 1–7 get one order each.
-- Users 8–10 have no orders.
-- ============================================================

DO
$$
    DECLARE
        current_user_id  BIGINT;
        current_order_id BIGINT;
        item_count       INTEGER;
        variant_id       BIGINT;
        item_quantity    INTEGER;
    BEGIN
        FOR current_user_id IN 1..7
            LOOP
                item_count := 1 + ((current_user_id - 1) % 5);

                INSERT INTO orders (user_id, status)
                VALUES (current_user_id, 'pending')
                RETURNING id INTO current_order_id;

                FOR i IN 1..item_count
                    LOOP
                        SELECT pv.id
                        INTO variant_id
                        FROM product_variants pv
                        WHERE pv.id = ((current_user_id - 1) * 7 + i)
                        LIMIT 1;

                        item_quantity := 1 + ((i - 1) % 3);

                        INSERT INTO order_items
                            (order_id, product_variant_id, quantity, price)
                        SELECT current_order_id, pv.id, item_quantity, pv.price
                        FROM product_variants pv
                        WHERE pv.id = variant_id;

                        UPDATE product_variants
                        SET quantity = quantity - item_quantity
                        WHERE id = variant_id
                          AND quantity >= item_quantity;
                    END LOOP;
            END LOOP;
    END
$$;