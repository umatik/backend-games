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
       (8, 'orders:delete'),
       (9, 'products:publish'),
       (10, 'settings:manage');

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
  (2, 8), -- orders:delete
  (2, 9), -- products:publish
  (2, 10); -- settings:manage

-- ============================================================
-- PRODUCTS
-- 50 products are seeded because API tests use product id 50.
-- Products 1–6 are hand-written examples of each case:
--   1 – split 7" (vinyl), 2 – LP in two pressings, one sold out,
--   3 – compilation, 4 – t-shirt, 5 – other (gadget), 6 – draft.
-- Products 7–50 are generated vinyl releases.
-- ============================================================

INSERT INTO products (id, type, title, slug, description, is_published, attributes)
VALUES (1, 'vinyl', 'Jah Prophecy', 'bunnington-judah-zulu-vibes-jah-prophecy-1',
        'Roots vocal with dub on the flip.', TRUE,
        '{
          "artists": ["Bunnington Judah", "Zulu Vibes"],
          "tracklist": [
            {"position": "A", "title": "Jah Prophecy", "artists": ["Bunnington Judah"]},
            {"position": "B", "title": "Prophetic Dub", "artists": ["Zulu Vibes"]}
          ],
          "previewLinks": []
        }'),
       (2, 'vinyl', 'Dub From Zion', 'roots-foundation-dub-from-zion-2',
        NULL, TRUE,
        '{
          "artists": ["Roots Foundation"],
          "tracklist": [
            {"position": "A1", "title": "Zion Gate"},
            {"position": "A2", "title": "Zion Gate Dub"},
            {"position": "B1", "title": "Babylon Fall"},
            {"position": "B2", "title": "Babylon Dub"}
          ],
          "previewLinks": ["https://www.youtube.com/watch?v=example-dub-from-zion"]
        }'),
       (3, 'vinyl', 'Sound System Selection Vol. 1', 'various-sound-system-selection-vol-1-3',
        NULL, TRUE,
        '{"artists": ["Various"], "tracklist": [], "previewLinks": []}'),
       (4, 'tshirt', 'Lion Yard Logo T-Shirt', 'lion-yard-logo-t-shirt-4',
        'Organic cotton, screen printed.', TRUE, '{}'),
       (5, 'other', 'Ethiopian Cross Pendant', 'ethiopian-cross-pendant-5',
        NULL, TRUE, '{}'),
       (6, 'vinyl', 'Unfinished Draft', 'seed-artist-unfinished-draft-6',
        NULL, FALSE,
        '{"artists": ["Seed Artist"], "tracklist": [], "previewLinks": []}');

INSERT INTO products (id, type, title, slug, is_published, attributes)
SELECT id,
       'vinyl',
       'Seed Release ' || id,
       'seed-artist-' || id || '-seed-release-' || id || '-' || id,
       TRUE,
       jsonb_build_object(
         'artists', jsonb_build_array('Seed Artist ' || id),
         'tracklist', '[]'::jsonb,
         'previewLinks', '[]'::jsonb
       )
FROM generate_series(7, 50) AS id;

-- Reset products sequence after manually assigned IDs.
SELECT setval(
           pg_get_serial_sequence('products', 'id'),
           (SELECT MAX(id) FROM products)
       );

-- ============================================================
-- PRODUCT VARIANTS
-- Two variants per product, prices in euro cents.
-- Product 50 therefore owns variants 99 and 100.
-- ============================================================

INSERT INTO product_variants (id, product_id, price_eur, quantity, attributes)
VALUES (1, 1, 1500, 3,
        '{"format": "7\"", "speed": 45, "year": 2025, "label": "Zulu Vibes", "catalogNumber": "ZV-7-006",
          "pressing": "original", "mediaCondition": "M", "sleeveCondition": "generic"}'),
       (2, 1, 1000, 1,
        '{"format": "7\"", "speed": 45, "year": 2025, "label": "Zulu Vibes", "catalogNumber": "ZV-7-006",
          "pressing": "original", "mediaCondition": "VG+", "sleeveCondition": "generic",
          "conditionNote": {"pl": "Lekki trzask na stronie B", "en": "Light crackle on side B",
                            "es": "Ligero crujido en la cara B"}}'),
       (3, 2, 4500, 1,
        '{"format": "LP", "speed": 33, "year": 1979, "label": "Lion Yard", "catalogNumber": "LY-001",
          "country": "UK", "pressing": "original", "mediaCondition": "VG+", "sleeveCondition": "VG"}'),
       (4, 2, 2500, 0,
        '{"format": "LP", "speed": 33, "year": 2019, "label": "Lion Yard", "catalogNumber": "LY-001R",
          "country": "DE", "pressing": "reissue", "mediaCondition": "NM", "sleeveCondition": "NM"}'),
       (5, 3, 3000, 2,
        '{"format": "LP", "speed": 33, "year": 2001, "label": "Seed Records", "mediaCondition": "VG",
          "sleeveCondition": "G+"}'),
       (6, 3, 1800, 1,
        '{"format": "LP", "speed": 33, "year": 2001, "label": "Seed Records", "mediaCondition": "G",
          "sleeveCondition": "no_cover"}'),
       (7, 4, 2500, 10, '{"color": "Black", "size": "M"}'),
       (8, 4, 2500, 8, '{"color": "Black", "size": "L"}'),
       (9, 5, 1200, 5, '{"details": "Brass, 5 cm"}'),
       (10, 5, 1900, 2, '{"details": "Silver, 7 cm"}'),
       (11, 6, 2000, 1,
        '{"format": "12\"", "speed": 45, "mediaCondition": "VG+", "sleeveCondition": "generic"}'),
       (12, 6, 1500, 1,
        '{"format": "12\"", "speed": 45, "mediaCondition": "VG", "sleeveCondition": "generic"}');

INSERT INTO product_variants (id, product_id, price_eur, quantity, attributes)
SELECT ((product_id - 1) * 2) + variant_no,
       product_id,
       4999 + (product_id * 100) + (variant_no * 1000),
       20 + product_id,
       jsonb_build_object(
         'format', CASE WHEN product_id % 2 = 0 THEN 'LP' ELSE '7"' END,
         'speed', CASE WHEN product_id % 2 = 0 THEN 33 ELSE 45 END,
         'label', 'Seed Records',
         'catalogNumber', 'SR-' || lpad(product_id::text, 3, '0'),
         'mediaCondition', CASE variant_no WHEN 1 THEN 'NM' ELSE 'VG' END,
         'sleeveCondition', CASE variant_no WHEN 1 THEN 'NM' ELSE 'generic' END
       )
FROM generate_series(7, 50) AS product_id
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