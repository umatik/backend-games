-- Zdjęcia labela zapisane przy rozpoznawaniu płyty, zanim powstanie wariant. Przy tworzeniu wariantu są
-- podpinane jako jego zdjęcia (pierwsze jako główne) i znikają z tej tabeli; nieużyte starsze niż 24 godziny
-- są usuwane razem z plikami.
CREATE TABLE pending_uploads
(
  id           UUID PRIMARY KEY,
  path         VARCHAR(2048) NOT NULL,
  content_type VARCHAR(100)  NOT NULL,
  created_by   BIGINT        REFERENCES users (id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pending_uploads_created_at ON pending_uploads (created_at);
