BEGIN;

CREATE TABLE IF NOT EXISTS device_sessions (
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  active boolean NOT NULL DEFAULT false,
  active_apps jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, device_id)
);

CREATE INDEX IF NOT EXISTS device_sessions_activity_idx
  ON device_sessions (last_activity_at DESC);

CREATE TABLE IF NOT EXISTS collaboration_memberships (
  owner_user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  collaborator_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission text NOT NULL CHECK (permission IN ('view', 'editor')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_user_id, collaborator_id),
  CHECK (owner_user_id <> collaborator_id)
);

INSERT INTO schema_migrations (version, name)
VALUES ('002', 'device_sessions_and_collaboration_memberships')
ON CONFLICT (version) DO NOTHING;

COMMIT;
