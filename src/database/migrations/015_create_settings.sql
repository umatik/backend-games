-- Ustawienia sklepu edytowane z panelu admina. Lista dozwolonych kluczy jest zdefiniowana w kodzie
-- (src/settings/definitions.ts). Sekrety (klucze API) trafiają wyłącznie do `encrypted_value`,
-- zaszyfrowane kluczem z SETTINGS_ENCRYPTION_KEY.
CREATE TABLE settings
(
  key             VARCHAR(100) PRIMARY KEY,
  value           JSONB,
  encrypted_value TEXT,
  updated_by      BIGINT       REFERENCES users (id) ON DELETE SET NULL,
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT chk_settings_one_value CHECK ((value IS NULL) <> (encrypted_value IS NULL))
);

-- Uprawnienie do zarządzania ustawieniami, dla istniejących baz (świeża baza dostaje je z seed_data.sql).
INSERT INTO permissions (id, name)
SELECT 10, 'settings:manage'
WHERE EXISTS (SELECT 1 FROM roles WHERE name = 'admin')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
       JOIN permissions p ON p.name = 'settings:manage'
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;
