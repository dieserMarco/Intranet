-- Optionale Migration für bestehende Datenbanken.
-- Bitte je nach MySQL/MariaDB Version einzeln ausführen und ggf. IF NOT EXISTS entfernen.

ALTER TABLE invite_tokens ADD COLUMN token_type VARCHAR(20) NOT NULL DEFAULT 'normal' AFTER token;
ALTER TABLE invite_tokens ADD COLUMN expires_at DATETIME NULL AFTER used;
ALTER TABLE invite_tokens ADD COLUMN created_by VARCHAR(100) NULL AFTER used_by;
CREATE INDEX idx_org_active_used ON invite_tokens (org_id, active, used);
CREATE INDEX idx_expires_at ON invite_tokens (expires_at);
