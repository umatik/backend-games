-- ============================================================
-- USERS
-- ============================================================

INSERT INTO users (email,
                   password_hash)
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


-- ============================================================
-- USER CONTACT DETAILS
-- ============================================================

INSERT INTO user_contact_details (user_id,
                                  first_name,
                                  last_name,
                                  phone,
                                  address,
                                  city,
                                  postal_code,
                                  country)
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
-- 100 products
-- ============================================================

INSERT INTO products (name)
SELECT 'Product ' || gs
FROM generate_series(1, 100) AS gs;


-- ============================================================
-- PRODUCT VARIANTS
-- Each product gets 1–5 variants.
-- ============================================================

INSERT INTO product_variants (product_id,
                              color,
                              size,
                              price,
                              quantity)
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
       ROUND((50 + random() * 1950)::numeric, 2),
       20 + floor(random() * 81)::integer
FROM products p
         CROSS JOIN LATERAL generate_series(
        1,
        1 + ((p.id - 1) % 5)
                            ) AS v(variant_number);


-- ============================================================
-- ORDERS
-- Users 1–7 get one order each.
-- Each order contains 1–5 items.
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

                INSERT INTO orders (user_id,
                                    status)
                VALUES (current_user_id,
                        'pending')
                RETURNING id INTO current_order_id;

                FOR i IN 1..item_count
                    LOOP

                        SELECT pv.id
                        INTO variant_id
                        FROM product_variants pv
                        WHERE pv.id = (SELECT MIN(id)
                                       FROM product_variants) + ((current_user_id - 1) * 7 + i - 1)
                        ORDER BY pv.id
                        LIMIT 1;

                        item_quantity := 1 + ((i - 1) % 3);

                        INSERT INTO order_items (order_id,
                                                 product_variant_id,
                                                 quantity,
                                                 price)
                        SELECT current_order_id,
                               pv.id,
                               item_quantity,
                               pv.price
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