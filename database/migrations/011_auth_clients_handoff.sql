CREATE TABLE auth_clients (
  app_key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  origin TEXT NOT NULL,
  callback_path TEXT NOT NULL DEFAULT '/',
  default_destination TEXT NOT NULL DEFAULT '/',
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

ALTER TABLE handoff_tokens ADD COLUMN app_key TEXT;
ALTER TABLE handoff_tokens ADD COLUMN destination TEXT;
ALTER TABLE links ADD COLUMN auth_client_key TEXT REFERENCES auth_clients(app_key) ON DELETE SET NULL;

CREATE INDEX idx_handoff_tokens_app_key ON handoff_tokens(app_key, used, expires_at);
CREATE INDEX idx_links_auth_client_key ON links(auth_client_key);

INSERT INTO auth_clients(app_key,name,origin,callback_path,default_destination,active)
VALUES('emulti','eMulti | Regulação','https://emulti.pages.dev','/','/painel.html',1);

UPDATE links
SET auth_client_key='emulti'
WHERE category='ferramenta'
  AND (
    feature_key='regulacao_vagas'
    OR lower(url) LIKE 'https://emulti.pages.dev%'
  );

INSERT INTO app_db_meta(app_key,schema_version,updated_at)
VALUES('portal_saude','2.11.0',datetime('now'))
ON CONFLICT(app_key) DO UPDATE SET schema_version=excluded.schema_version,updated_at=excluded.updated_at;
