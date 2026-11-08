-- Uprawnienie do publikowania produktów, dla istniejących baz (świeża baza dostaje je z seed_data.sql).
-- Na pustej bazie (przed seedem) nic się nie dzieje, żeby nie zająć id, które nadaje seed.
INSERT INTO permissions (id, name)
SELECT 9, 'products:publish'
WHERE EXISTS (SELECT 1 FROM roles WHERE name = 'admin')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
       JOIN permissions p ON p.name = 'products:publish'
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;
