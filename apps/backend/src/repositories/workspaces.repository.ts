import { database } from "../infrastructure/database.js";

export async function getWorkspace(ownerUserId: string): Promise<Record<string, unknown>> {
  const result = await database.query(
    "SELECT state FROM workspaces WHERE owner_user_id = $1 AND workspace_key = 'default'",
    [ownerUserId],
  );
  return (result.rows[0]?.state as Record<string, unknown> | undefined) ?? {};
}

export async function saveWorkspace(ownerUserId: string, state: Record<string, unknown>): Promise<void> {
  await database.query(
    `INSERT INTO workspaces (owner_user_id, workspace_key, state, version)
     VALUES ($1, 'default', $2::jsonb, 1)
     ON CONFLICT (owner_user_id, workspace_key)
     DO UPDATE SET state = EXCLUDED.state, version = workspaces.version + 1, updated_at = now()`,
    [ownerUserId, JSON.stringify(state)],
  );
}
