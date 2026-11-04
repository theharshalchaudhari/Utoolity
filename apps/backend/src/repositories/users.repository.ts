import { database } from "../infrastructure/database.js";

export type UserRecord = {
  id: string;
  hostname: string;
  displayName: string;
  passwordHash: string;
  deviceId: string;
  role: "intern" | "admin";
  preferences: Record<string, string>;
};

const defaults: Record<string, string> = {
  "utoolity.icon-size": "large",
  "utoolity.grain": "none",
  "utoolity.theme": "device",
};

const selectUser = `
  SELECT u.id, u.hostname, u.display_name, u.password_hash, u.device_id, u.role,
         COALESCE(
           jsonb_object_agg(p.preference_key, p.value #>> '{}')
             FILTER (WHERE p.preference_key IS NOT NULL),
           '{}'::jsonb
         ) AS preferences
  FROM users u
  LEFT JOIN user_preferences p ON p.user_id = u.id
`;

function mapUser(row: Record<string, unknown>): UserRecord {
  return {
    id: String(row.id),
    hostname: String(row.hostname),
    displayName: String(row.display_name),
    passwordHash: String(row.password_hash ?? ""),
    deviceId: String(row.device_id ?? row.hostname),
    role: row.role === "admin" ? "admin" : "intern",
    preferences: { ...defaults, ...((row.preferences as Record<string, string>) ?? {}) },
  };
}

export async function listUsers(): Promise<UserRecord[]> {
  const result = await database.query(`${selectUser} GROUP BY u.id ORDER BY u.display_name`);
  return result.rows.map(mapUser);
}

export async function findUserById(id: string): Promise<UserRecord | undefined> {
  const result = await database.query(`${selectUser} WHERE u.id = $1 GROUP BY u.id LIMIT 1`, [id]);
  return result.rows[0] ? mapUser(result.rows[0]) : undefined;
}

export async function findUserByHostname(hostname: string): Promise<UserRecord | undefined> {
  const result = await database.query(`${selectUser} WHERE lower(u.hostname) = lower($1) GROUP BY u.id LIMIT 1`, [hostname.trim()]);
  return result.rows[0] ? mapUser(result.rows[0]) : undefined;
}

export async function findUserByDeviceId(deviceId: string): Promise<UserRecord | undefined> {
  const result = await database.query(`${selectUser} WHERE u.device_id = $1 GROUP BY u.id LIMIT 1`, [deviceId]);
  return result.rows[0] ? mapUser(result.rows[0]) : undefined;
}

export async function createUser(input: {
  id: string; hostname: string; displayName: string; passwordHash: string;
  deviceId: string; role?: "intern" | "admin"; preferences: Record<string, string>;
}): Promise<UserRecord> {
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO users (id, hostname, display_name, password_hash, device_id, role)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [input.id, input.hostname, input.displayName, input.passwordHash, input.deviceId, input.role ?? "intern"],
    );
    for (const [key, value] of Object.entries(input.preferences)) {
      await client.query(
        `INSERT INTO user_preferences (user_id, preference_key, value)
         VALUES ($1, $2, to_jsonb($3::text))
         ON CONFLICT (user_id, preference_key)
         DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
        [input.id, key, value],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  const user = await findUserById(input.id);
  if (!user) throw new Error("User insert completed but the record could not be reloaded.");
  return user;
}

export async function updatePreferences(userId: string, values: Record<string, string>): Promise<Record<string, string>> {
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    const exists = await client.query("SELECT 1 FROM users WHERE id = $1 FOR UPDATE", [userId]);
    if (!exists.rowCount) throw new Error("Session user no longer exists.");
    for (const [key, value] of Object.entries(values)) {
      await client.query(
        `INSERT INTO user_preferences (user_id, preference_key, value)
         VALUES ($1, $2, to_jsonb($3::text))
         ON CONFLICT (user_id, preference_key)
         DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
        [userId, key, value],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  const user = await findUserById(userId);
  if (!user) throw new Error("Session user no longer exists.");
  return user.preferences;
}

export async function updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
  await database.query(
    "UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1",
    [userId, passwordHash],
  );
}
