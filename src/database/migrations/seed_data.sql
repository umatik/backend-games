-- ============================================================
-- USERS
-- ============================================================

INSERT INTO users (id, email, password_hash)
VALUES (1, 'alice@example.com', '$2b$10$Gu16e9j5R6NCwK8JltQ6POG0fBcoSc6tPydoymO1pFzChW.mVEMqG'),
       (2, 'bob@example.com', '$2b$10$Gu16e9j5R6NCwK8JltQ6POG0fBcoSc6tPydoymO1pFzChW.mVEMqG'),
       (3, 'page1@example.com', '$2b$10$Gu16e9j5R6NCwK8JltQ6POG0fBcoSc6tPydoymO1pFzChW.mVEMqG'),
       (4, 'page2@example.com', '$2b$10$Gu16e9j5R6NCwK8JltQ6POG0fBcoSc6tPydoymO1pFzChW.mVEMqG');

INSERT INTO user_contact_details
(user_id, first_name, last_name, phone, address, city, postal_code, country)
VALUES (1, 'Alice', 'Test', '123456789', 'Test Street 1', 'Warsaw', '00-001', 'Poland'),
       (2, 'Bob', 'Admin', '987654321', 'Admin Street 1', 'Warsaw', '00-002', 'Poland'),
       (3, 'Page', 'One', '111111111', 'Test Street 3', 'Warsaw', '00-003', 'Poland'),
       (4, 'Page', 'Two', '222222222', 'Test Street 4', 'Warsaw', '00-004', 'Poland');

-- Reset users sequence after manually assigned IDs.
SELECT setval(
           pg_get_serial_sequence('users', 'id'),
           (SELECT MAX(id) FROM users)
       );

-- ============================================================
-- ROLES
-- ============================================================

INSERT INTO roles (id, name)
VALUES (1, 'user'),
       (2, 'admin');

INSERT INTO user_roles (user_id, role_id)
VALUES (1, 1),
       (2, 2),
       (3, 1),
       (4, 1);

-- ============================================================
-- PERMISSIONS
-- ============================================================

INSERT INTO permissions (id, name)
VALUES (1, 'users:read'),
       (2, 'users:update'),
       (3, 'products:create'),
       (4, 'products:update'),
       (5, 'products:delete'),
       (6, 'orders:create'),
       (7, 'orders:read'),
       (8, 'orders:delete');

INSERT INTO role_permissions (role_id, permission_id)
VALUES
  -- regular user
  (1, 2), -- users:update
  (1, 6), -- orders:create
  (1, 8), -- orders:delete

  -- admin
  (2, 1), -- users:read
  (2, 2), -- users:update
  (2, 3), -- products:create
  (2, 4), -- products:update
  (2, 5), -- products:delete
  (2, 6), -- orders:create
  (2, 7), -- orders:read
  (2, 8);
-- orders:delete

-- ============================================================
-- PRODUCTS
-- 50 products are seeded because API tests use product id 50.
-- ============================================================

INSERT INTO products (id, name)
SELECT id,
       'Seed Product ' || id
FROM generate_series(1, 50) AS id;

-- Reset products sequence after manually assigned IDs.
SELECT setval(
           pg_get_serial_sequence('products', 'id'),
           (SELECT MAX(id) FROM products)
       );

-- ============================================================
-- PRODUCT VARIANTS
-- Two variants per product.
-- Product 50 therefore owns variants 99 and 100.
-- ============================================================

INSERT INTO product_variants
  (id, product_id, color, size, price, quantity)
SELECT ((product_id - 1) * 2) + variant_no,
       product_id,
       CASE variant_no
         WHEN 1 THEN 'Black'
         ELSE 'White'
         END,
       CASE variant_no
         WHEN 1 THEN 'M'
         ELSE 'L'
         END,
       (49.99 + product_id + (variant_no * 10))::numeric(10, 2),
       20 + product_id
FROM generate_series(1, 50) AS product_id
       CROSS JOIN generate_series(1, 2) AS variant_no;

-- Reset product variants sequence after manually assigned IDs.
SELECT setval(
           pg_get_serial_sequence('product_variants', 'id'),
           (SELECT MAX(id) FROM product_variants)
       );

-- ============================================================
-- PRODUCT VARIANT MEDIA
-- Each variant gets 4–8 media items.
-- Mostly photos, plus mp3, mov, mp4, zip and pdf.
-- ============================================================

INSERT INTO product_variant_media
  (product_variant_id, type, url, alt, sort_order, is_primary)
SELECT pv.id,
       media.type,
       media.url,
       media.alt,
       media.sort_order,
       media.is_primary
FROM product_variants pv
       CROSS JOIN LATERAL (
  SELECT 'photo'::text                                                 AS type,
         'https://example.com/products/variant-' || pv.id || '-01.jpg' AS url,
         'Product variant ' || pv.id || ' photo 1'                     AS alt,
         1                                                             AS sort_order,
         TRUE                                                          AS is_primary

  UNION ALL

  SELECT 'photo',
         'https://example.com/products/variant-' || pv.id || '-02.jpg',
         'Product variant ' || pv.id || ' photo 2',
         2,
         FALSE

  UNION ALL

  SELECT 'photo',
         'https://example.com/products/variant-' || pv.id || '-03.jpg',
         'Product variant ' || pv.id || ' photo 3',
         3,
         FALSE

  UNION ALL

  SELECT 'photo',
         'https://example.com/products/variant-' || pv.id || '-04.jpg',
         'Product variant ' || pv.id || ' photo 4',
         4,
         FALSE

  UNION ALL

  SELECT CASE pv.id % 5
           WHEN 0 THEN 'audio'
           WHEN 1 THEN 'video'
           WHEN 2 THEN 'video'
           WHEN 3 THEN 'document'
           ELSE 'document'
           END,
         CASE pv.id % 5
           WHEN 0 THEN
             'https://example.com/products/variant-' || pv.id || '.mp3'
           WHEN 1 THEN
             'https://example.com/products/variant-' || pv.id || '.mov'
           WHEN 2 THEN
             'https://example.com/products/variant-' || pv.id || '.mp4'
           WHEN 3 THEN
             'https://example.com/products/variant-' || pv.id || '.zip'
           ELSE
             'https://example.com/products/variant-' || pv.id || '.pdf'
           END,
         'Product variant ' || pv.id || ' additional file',
         5,
         FALSE

  UNION ALL

  SELECT 'photo',
         'https://example.com/products/variant-' || pv.id || '-05.jpg',
         'Product variant ' || pv.id || ' photo 5',
         6,
         FALSE

  UNION ALL

  SELECT CASE
           WHEN pv.id % 2 = 0 THEN 'photo'
           ELSE 'document'
           END,
         CASE
           WHEN pv.id % 2 = 0 THEN
             'https://example.com/products/variant-' || pv.id || '-06.jpg'
           ELSE
             'https://example.com/products/variant-' || pv.id || '-manual.pdf'
           END,
         'Product variant ' || pv.id || ' additional file 2',
         7,
         FALSE

  UNION ALL

  SELECT 'photo',
         'https://example.com/products/variant-' || pv.id || '-07.jpg',
         'Product variant ' || pv.id || ' photo 7',
         8,
         FALSE
  ) AS media
WHERE media.sort_order <= 4 + (pv.id % 5);