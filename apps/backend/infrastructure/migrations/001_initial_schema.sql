-- Utoolity PostgreSQL foundation
-- Apply with: node tools/database/postgres.cjs apps/backend/infrastructure/migrations/001_initial_schema.sql
-- The target database (utoolity) must exist before this migration is executed.

BEGIN;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version       text PRIMARY KEY,
  name          text NOT NULL,
  checksum      text,
  applied_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id              text PRIMARY KEY,
  hostname        text NOT NULL UNIQUE,
  display_name    text NOT NULL,
  password_hash   text NOT NULL DEFAULT '',
  device_id       text,
  role            text NOT NULL DEFAULT 'intern'
                  CHECK (role IN ('intern', 'admin')),
  profile         jsonb NOT NULL DEFAULT '{}'::jsonb
                  CHECK (jsonb_typeof(profile) = 'object'),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS users_role_idx ON users (role);
CREATE INDEX IF NOT EXISTS users_updated_at_idx ON users (updated_at DESC);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id       text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  preference_key text NOT NULL,
  value          jsonb NOT NULL,
  updated_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, preference_key)
);

CREATE INDEX IF NOT EXISTS user_preferences_updated_at_idx
  ON user_preferences (updated_at DESC);

CREATE TABLE IF NOT EXISTS workspaces (
  id             bigserial PRIMARY KEY,
  owner_user_id  text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_key  text NOT NULL,
  state          jsonb NOT NULL DEFAULT '{}'::jsonb
                 CHECK (jsonb_typeof(state) = 'object'),
  version        bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_user_id, workspace_key)
);

CREATE INDEX IF NOT EXISTS workspaces_updated_at_idx
  ON workspaces (updated_at DESC);

CREATE TABLE IF NOT EXISTS issue_reports (
  id             bigserial PRIMARY KEY,
  reporter_user_id text REFERENCES users(id) ON DELETE SET NULL,
  reporter        jsonb NOT NULL DEFAULT '{"type":"unconfigured_device","label":"Unconfigured device"}'::jsonb
                  CHECK (jsonb_typeof(reporter) = 'object'),
  app_name        text NOT NULL,
  error_name      text NOT NULL,
  details         text NOT NULL DEFAULT '',
  description     text NOT NULL DEFAULT '',
  source          text NOT NULL DEFAULT '',
  request_id      text,
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb
                  CHECK (jsonb_typeof(metadata) = 'object'),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS issue_reports_created_at_idx
  ON issue_reports (created_at DESC);
CREATE INDEX IF NOT EXISTS issue_reports_reporter_user_idx
  ON issue_reports (reporter_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS issue_reports_request_id_idx
  ON issue_reports (request_id)
  WHERE request_id IS NOT NULL;

-- Records the one-time JSON import so restarts/redeploys cannot import it twice.
-- The importer should mark a source complete only after its transaction commits.
CREATE TABLE IF NOT EXISTS legacy_imports (
  source_key    text PRIMARY KEY,
  status        text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'completed', 'failed')),
  imported_rows bigint NOT NULL DEFAULT 0 CHECK (imported_rows >= 0),
  checksum      text,
  error         text,
  started_at    timestamptz NOT NULL DEFAULT now(),
  completed_at  timestamptz
);

INSERT INTO schema_migrations (version, name)
VALUES ('001', 'initial_postgresql_schema')
ON CONFLICT (version) DO NOTHING;

COMMIT;
