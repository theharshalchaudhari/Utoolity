import type { FastifyInstance, FastifyRequest } from "fastify";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

type InternUser = {
  id: string;
  hostname: string;
  displayName: string;
  password: string;
  deviceId?: string;
  role: "intern" | "admin";
  preferences?: Record<string, string>;
};

type UsersFile = {
  users: InternUser[];
};

type CredentialsBody = {
  hostname?: string;
  password?: string;
};

type PublicUser = Pick<
  InternUser,
  "id" | "hostname" | "displayName" | "role"
> & { passwordConfigured: boolean };

type AuthSession = {
  userId?: string;
  deviceId?: string;
  role?: "intern" | "admin";
  lastActivityAt?: number;
  collaborationOwnerUserId?: string;
  collaborationPermission?: "view" | "editor";
  save(callback: (error?: Error) => void): void;
  destroy(callback: (error?: Error) => void): void;
};
type WorkspaceState = Record<string, unknown>;
type SessionRecord = {
  userId: string;
  hostname: string;
  displayName: string;
  deviceId: string;
  role: "intern" | "admin";
  active: boolean;
  activeApps: unknown[];
  lastActivityAt: number;
  updatedAt: number;
};

const preferenceKeys = new Set([
  "utoolity.wallpaper",
  "utoolity.lockscreen",
  "utoolity.animations",
  "utoolity.grain",
  "utoolity.theme",
  "utoolity.icon-size",
]);
const defaultPreferences: Record<string, string> = {
  "utoolity.icon-size": "large",
  "utoolity.grain": "none",
  "utoolity.theme": "device",
};

function getSession(request: FastifyRequest): AuthSession {
  return (request as FastifyRequest & { session: AuthSession }).session;
}

async function readSessions(): Promise<Record<string, SessionRecord>> {
  try {
    const text = (await readFile(sessionsFilePath, "utf8")).trim();
    if (!text) return {};
    const raw = JSON.parse(text) as {
      sessions?: Record<string, SessionRecord>;
    };
    return raw.sessions ?? {};
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    // Empty or malformed legacy state must not make every lock-screen request fail.
    return {};
  }
}

async function writeSessions(
  sessions: Record<string, SessionRecord>,
): Promise<void> {
  await writeFile(
    sessionsFilePath,
    `${JSON.stringify({ sessions }, null, 2)}\n`,
    "utf8",
  );
}

let preferenceWriteQueue: Promise<void> = Promise.resolve();
let sessionUpdateQueue: Promise<void> = Promise.resolve();
let workspaceUpdateQueue: Promise<void> = Promise.resolve();
const deviceInactivityTimers = new Map<string, ReturnType<typeof setTimeout>>();

type CollaborationClient = {
  socket: { readyState: number; send(data: string): void };
  request: FastifyRequest;
  userId: string;
  displayName: string;
  role: string;
  joinedOwnerUserId?: string;
  permission?: "view" | "editor";
};
const collaborationClients = new Map<string, CollaborationClient>();
const sharedSessions = new Map<string, Map<string, "view" | "editor">>();
const pendingJoinRequests = new Map<string, string>();
const liveWorkspaces = new Map<string, WorkspaceState>();
function sendToUser(userId: string, payload: unknown): void {
  const message = JSON.stringify(payload);
  for (const client of collaborationClients.values()) {
    if (client.userId === userId && client.socket.readyState === 1)
      client.socket.send(message);
  }
}
function sendToSharedSession(
  ownerUserId: string,
  payload: unknown,
  exceptUserId?: string,
): void {
  const allowed = new Set([
    ownerUserId,
    ...(sharedSessions.get(ownerUserId) ?? new Map()).keys(),
  ]);
  const message = JSON.stringify(payload);
  for (const client of collaborationClients.values()) {
    if (
      allowed.has(client.userId) &&
      client.userId !== exceptUserId &&
      client.socket.readyState === 1
    ) {
      client.socket.send(message);
    }
  }
}
function sharedOwnerFor(client: CollaborationClient): string | undefined {
  if (sharedSessions.has(client.userId)) return client.userId;
  return client.joinedOwnerUserId;
}
function broadcastPresence(): void {
  const users = [...collaborationClients.values()].map(
    ({ userId, displayName, role }) => ({
      userId,
      displayName,
      role,
    }),
  );
  const payload = JSON.stringify({ type: "presence", users });
  for (const client of collaborationClients.values()) {
    if (client.socket.readyState === 1) client.socket.send(payload);
  }
}
function broadcastCollaboration(payload: string, exceptKey?: string): void {
  for (const [key, client] of collaborationClients) {
    if (key !== exceptKey && client.socket.readyState === 1)
      client.socket.send(payload);
  }
}

function getDeviceId(request: FastifyRequest, fallback: string): string {
  const candidate = request.headers["x-utoolity-device-id"];
  if (
    typeof candidate === "string" &&
    /^[a-zA-Z0-9._:-]{8,128}$/.test(candidate)
  ) {
    return candidate;
  }
  return fallback;
}

async function updateSessionRecord(
  user: InternUser,
  values: Pick<SessionRecord, "active" | "activeApps" | "lastActivityAt">,
  deviceId = user.hostname,
): Promise<void> {
  const write = sessionUpdateQueue.then(async () => {
    const sessions = await readSessions();
    const now = Date.now();
    const recordKey = `${user.id}:${deviceId}`;
    const legacyRecord = sessions[user.id];
    if (legacyRecord) {
      if (legacyRecord.deviceId && legacyRecord.deviceId !== deviceId) {
        const legacyKey = `${user.id}:${legacyRecord.deviceId}`;
        if (!sessions[legacyKey]) sessions[legacyKey] = legacyRecord;
      }
      delete sessions[user.id];
    }
    for (const [key, record] of Object.entries(sessions)) {
      if (record.deviceId === deviceId && record.userId !== user.id) {
        delete sessions[key];
      }
    }
    sessions[recordKey] = {
      userId: user.id,
      hostname: user.hostname,
      displayName: user.displayName,
      deviceId,
      role: user.role,
      ...values,
      updatedAt: now,
    };
    await writeSessions(sessions);
  });
  sessionUpdateQueue = write.catch(() => undefined);
  await write;
}

const usersFilePath = fileURLToPath(
  new URL("../data/users.json", import.meta.url),
);
const workspacesFilePath = fileURLToPath(
  new URL("../data/workspaces.json", import.meta.url),
);
const sessionsFilePath = fileURLToPath(
  new URL("../data/sessions.json", import.meta.url),
);

const validWallpaperIds = new Set([
  "Default",
  "Desert",
  "Lakeside",
  "Rancho",
  "Sands",
  "Live/Blossom.mp4",
  "Live/Cyber.mp4",
  "Live/Islands.mp4",
]);

function normalizeUserRecord(value: unknown): InternUser {
  if (!value || typeof value !== "object") {
    throw new Error("users.json contains an invalid user record.");
  }
  const user = value as InternUser & { macId?: string };
  const profile = { ...user };
  delete profile.macId;
  const hostname =
    typeof user.hostname === "string" ? user.hostname.trim() : "";
  if (!hostname || typeof user.displayName !== "string") {
    throw new Error("Each user must have a hostname and displayName.");
  }
  const oldPreferences = user.preferences ?? {};
  const oldWallpaper = oldPreferences["utoolity.wallpaper"];
  const wallpaperAliases: Record<string, string> = {
    "default.jpg": "Default",
    "dark.jpg": "Default",
    "light.jpg": "Default",
    "new.jpg": "Default",
    Midnight: "Default",
  };
  const requestedWallpaper = oldWallpaper
    ? (wallpaperAliases[oldWallpaper] ?? oldWallpaper)
    : undefined;
  const theme = oldPreferences["utoolity.theme"];
  const preferences: Record<string, string> = {
    ...oldPreferences,
    "utoolity.icon-size": oldPreferences["utoolity.icon-size"] ?? "large",
      "utoolity.grain": oldPreferences["utoolity.grain"] ?? "none",
    "utoolity.theme":
      theme === "dark" || theme === "light" ? theme : "device",
  };

  // An absent wallpaper is a real "not configured" state. Only invalid
  // non-empty values are repaired to Default; a selected ID remains untouched.
  if (requestedWallpaper) {
    preferences["utoolity.wallpaper"] = validWallpaperIds.has(requestedWallpaper)
      ? requestedWallpaper
      : "Default";
  } else {
    delete preferences["utoolity.wallpaper"];
  }

  return {
    ...profile,
    id: hostname,
    hostname,
    deviceId: hostname,
    role: user.role === "admin" ? "admin" : "intern",
    password: typeof user.password === "string" ? user.password : "",
    preferences,
  };
}

async function readUsers(): Promise<InternUser[]> {
  const raw = await readFile(usersFilePath, "utf8");
  const parsed: unknown = JSON.parse(raw);

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("users" in parsed) ||
    !Array.isArray(parsed.users)
  ) {
    throw new Error("users.json must contain a users array.");
  }

  const original = parsed.users as Array<InternUser & { macId?: string }>;
  const users = original.map(normalizeUserRecord);
  // Migrate the existing JSON store in place while preserving passwords and
  // any supported per-profile settings. Future database migration can consume
  // this normalized shape without another manual cleanup.
  if (JSON.stringify(original) !== JSON.stringify(users)) {
    await writeFile(
      usersFilePath,
      `${JSON.stringify({ users }, null, 2)}\n`,
      "utf8",
    );
  }
  return users;
}

async function readWorkspaces(): Promise<Record<string, WorkspaceState>> {
  try {
    const text = (await readFile(workspacesFilePath, "utf8")).trim();
    if (!text) return {};
    const raw = JSON.parse(text) as {
      workspaces?: Record<string, WorkspaceState>;
    };
    return raw.workspaces ?? {};
  } catch {
    return {};
  }
}

async function writeUsers(users: InternUser[]): Promise<void> {
  await writeFile(
    usersFilePath,
    `${JSON.stringify({ users }, null, 2)}\n`,
    "utf8",
  );
}

function publicUser(user: InternUser): PublicUser {
  return {
    id: user.id,
    hostname: user.hostname,
    displayName: user.displayName,
    role: user.role,
    passwordConfigured: Boolean(user.password),
  };
}

function findByHostname(
  users: InternUser[],
  hostname: string,
): InternUser | undefined {
  const normalizedHostname = hostname.trim().toLowerCase();

  return users.find(
    (user) => user.hostname.trim().toLowerCase() === normalizedHostname,
  );
}

function findById(users: InternUser[], id: string): InternUser | undefined {
  return users.find((user) => user.id === id);
}

function validCredentials(
  body: CredentialsBody | undefined,
): body is { hostname: string; password: string } {
  return (
    typeof body?.hostname === "string" &&
    body.hostname.trim().length > 0 &&
    body.hostname.length <= 255 &&
    typeof body.password === "string" &&
    body.password.length > 0 &&
    body.password.length <= 1024
  );
}

function saveSession(request: FastifyRequest): Promise<void> {
  return new Promise((resolve, reject) => {
    getSession(request).save((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function destroySession(request: FastifyRequest): Promise<void> {
  return new Promise((resolve, reject) => {
    getSession(request).destroy((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

async function establishSession(
  request: FastifyRequest,
  user: InternUser,
): Promise<void> {
  const session = getSession(request);
  session.userId = user.id;
  // After profile resolution, use the server-side assigned identity, not the lock-screen cache.
  session.deviceId = user.deviceId ?? user.hostname;
  session.role = user.role;
  session.lastActivityAt = Date.now();
  await saveSession(request);
}

export default async function authRoutes(app: FastifyInstance) {
  app.post<{
    Body: {
      appName?: string;
      errorName?: string;
      details?: string;
      description?: string;
      source?: string;
      requestId?: string;
    };
  }>("/auth/report-issue", async (request, reply) => {
    const body = request.body ?? {};
    const appName =
      typeof body.appName === "string"
        ? body.appName.trim().slice(0, 120)
        : "Desktop";
    const errorName =
      typeof body.errorName === "string"
        ? body.errorName.trim().slice(0, 160)
        : "Application error";
    const details =
      typeof body.details === "string"
        ? body.details.trim().slice(0, 12000)
        : "";
    const description =
      typeof body.description === "string"
        ? body.description.trim().slice(0, 4000)
        : "";
    const source =
      typeof body.source === "string" ? body.source.trim().slice(0, 500) : "";
    const requestId =
      typeof body.requestId === "string"
        ? body.requestId.trim().slice(0, 128)
        : "";
    if (!appName || !errorName || (!details && !description)) {
      return reply.code(400).send({
        message:
          "App name, error name, and error details or description are required.",
      });
    }

    try {
      const userId = getSession(request).userId;
      let reportedBy: Record<string, string> = {
        type: "unconfigured_device",
        label: "Unconfigured device",
      };
      if (userId) {
        try {
          const users = await readUsers();
          const user = findById(users, userId);
          if (user) {
            reportedBy = {
              type: "authenticated_device",
              id: user.id,
              hostname: user.hostname,
              displayName: user.displayName,
              role: user.role,
            };
          }
        } catch (error) {
          request.log.warn({ err: error }, "Unable to resolve issue reporter identity");
        }
      }

      const reportsFilePath = fileURLToPath(
        new URL("../data/issue-reports.json", import.meta.url),
      );
      let reports: Array<Record<string, unknown>> = [];
      try {
        const raw = await readFile(reportsFilePath, "utf8");
        const parsed = JSON.parse(raw) as {
          reports?: Array<Record<string, unknown>>;
        };
        reports = Array.isArray(parsed.reports) ? parsed.reports : [];
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
      const report = {
        id: `issue-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        appName,
        errorName,
        details,
        description,
        source,
        requestId,
        reportedBy,
        reportedAt: new Date().toISOString(),
        status: "open",
      };
      reports.push(report);
      await writeFile(
        reportsFilePath,
        `${JSON.stringify({ reports }, null, 2)}\\n`,
        "utf8",
      );
      request.log.warn({ reportId: report.id, reportedBy: reportedBy.type }, "Issue report received");
      return reply.code(201).send({ success: true, reportId: report.id });
    } catch (error) {
      request.log.error(error, "Unable to save issue report");
      return reply.code(500).send({
        message: "Unable to save the issue report. Please try again.",
      });
    }
  });

  app.get("/auth/workspace", async (request, reply) => {
    const userId = getSession(request).userId;
    if (!userId) return reply.code(401).send({ message: "Not authenticated." });
    const workspaces = await readWorkspaces();
    return { workspace: workspaces[userId] ?? {} };
  });

  app.put<{ Body: WorkspaceState }>(
    "/auth/workspace",
    async (request, reply) => {
      const userId = getSession(request).userId;
      if (!userId)
        return reply.code(401).send({ message: "Not authenticated." });
      const users = await readUsers();
      const user = findById(users, userId);
      if (!user)
        return reply
          .code(401)
          .send({ message: "Session user no longer exists." });
      const workspaces = await readWorkspaces();
      workspaces[userId] = request.body ?? {};
      await writeFile(
        workspacesFilePath,
        JSON.stringify({ workspaces }, null, 2),
      );
      const activeApps =
        request.body && Array.isArray(request.body.openApps)
          ? request.body.openApps
          : [];
      const deviceId = user.deviceId ?? user.hostname;
      const currentSessions = await readSessions();
      const existing =
        currentSessions[`${user.id}:${deviceId}`] ?? currentSessions[user.id];
      await updateSessionRecord(
        user,
        {
          active: true,
          activeApps: activeApps.length
            ? activeApps
            : (existing?.activeApps ?? []),
          lastActivityAt: Date.now(),
        },
        deviceId,
      );
      return { success: true };
    },
  );

  app.post("/auth/activity", async (request, reply) => {
    const session = getSession(request);
    if (!session.userId) {
      return reply.code(401).send({ message: "Not authenticated." });
    }
    session.lastActivityAt = Date.now();
    try {
      const users = await readUsers();
      const user = findById(users, session.userId);
      if (user) {
        const sessions = await readSessions();
        const deviceId = user.deviceId ?? user.hostname;
        const existing =
          sessions[`${user.id}:${deviceId}`] ?? sessions[user.id];
        await updateSessionRecord(
          user,
          {
            active: true,
            activeApps: existing?.activeApps ?? [],
            lastActivityAt: session.lastActivityAt,
          },
          deviceId,
        );
      }
    } catch (error) {
      request.log.error(error, "Unable to persist session activity.");
    }
    await saveSession(request);
    return { success: true, lastActivityAt: session.lastActivityAt };
  });

  // POST /api/auth/login
  app.post<{ Body: CredentialsBody }>("/auth/login", async (request, reply) => {
    if (
      typeof request.body?.hostname !== "string" ||
      !request.body.hostname.trim() ||
      request.body.hostname.length > 255 ||
      typeof request.body.password !== "string" ||
      request.body.password.length > 1024
    ) {
      return reply.code(400).send({
        message: "A valid hostname and password are required.",
      });
    }

    try {
      const users = await readUsers();
      const deviceId = getDeviceId(request, "");
      const assignedUser = deviceId
        ? users.find((candidate) => candidate.deviceId === deviceId)
        : undefined;
      const user = assignedUser ?? findByHostname(users, request.body.hostname);

      if (
        !user ||
        user.hostname.toLowerCase() !==
          request.body.hostname.trim().toLowerCase() ||
        user.password !== request.body.password
      ) {
        return reply.code(401).send({
          message: "Invalid hostname or password.",
        });
      }

      await establishSession(request, user);
      await updateSessionRecord(
        user,
        {
          active: true,
          activeApps: [],
          lastActivityAt: Date.now(),
        },
        user.deviceId ?? user.hostname,
      );

      return {
        user: publicUser(user),
      };
    } catch (error) {
      request.log.error(error, "Login failed unexpectedly");

      return reply.code(500).send({
        message: "Unable to sign in right now.",
      });
    }
  });

  // POST /api/auth/logout
  app.post("/auth/logout", async (request, reply) => {
    try {
      const session = getSession(request);
      if (session.userId) {
        const users = await readUsers();
        const user = findById(users, session.userId);
        if (user) {
          await updateSessionRecord(
            user,
            {
              active: false,
              activeApps: [],
              lastActivityAt: Date.now(),
            },
            user.deviceId ?? user.hostname,
          );
        }
      }
      await destroySession(request);
      reply.header(
        "Set-Cookie",
        "sessionId=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax",
      );

      return { success: true };
    } catch (error) {
      request.log.error(error, "Logout failed");

      return reply.code(500).send({
        message: "Unable to sign out right now.",
      });
    }
  });

  // GET /api/auth/me
  app.get("/auth/me", async (request, reply) => {
    const userId = getSession(request).userId;

    if (!userId) {
      return reply.code(401).send({
        message: "Not authenticated.",
      });
    }

    try {
      const users = await readUsers();
      const user = findById(users, userId);

      if (!user) {
        await destroySession(request);
        reply.header(
          "Set-Cookie",
          "sessionId=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax",
        );

        return reply.code(401).send({
          message: "Session user no longer exists.",
        });
      }

      return {
        user: publicUser(user),
      };
    } catch (error) {
      request.log.error(error, "Unable to load current user");

      return reply.code(500).send({
        message: "Unable to load the current user.",
      });
    }
  });

  // Keep preference routes at registration time, not inside /auth/me's catch
  // handler (which made them unreachable and left the routes unregistered).
  app.get("/auth/preferences", async (request, reply) => {
    const userId = getSession(request).userId;
    if (!userId) {
      return reply.code(401).send({ message: "Not authenticated." });
    }

    try {
      const user = findById(await readUsers(), userId);
      if (!user) {
        return reply
          .code(401)
          .send({ message: "Session user no longer exists." });
      }
      return {
        preferences: { ...defaultPreferences, ...(user.preferences ?? {}) },
      };
    } catch (error) {
      request.log.error(error, "Unable to load user preferences");
      return reply.code(500).send({ message: "Unable to load preferences." });
    }
  });

  app.patch<{ Body: Record<string, unknown> }>(
    "/auth/preferences",
    async (request, reply) => {
      const userId = getSession(request).userId;
      if (!userId) {
        return reply.code(401).send({ message: "Not authenticated." });
      }

      const entries = Object.entries(request.body ?? {});
      if (
        entries.length === 0 ||
        entries.some(
          ([key, value]) =>
            !preferenceKeys.has(key) ||
            typeof value !== "string" ||
            value.length > 100,
        )
      ) {
        return reply.code(400).send({ message: "Invalid preference payload." });
      }

      try {
        // Serialize read-modify-write operations: wallpaper, theme and grain can
        // be changed in quick succession, and parallel JSON writes can overwrite
        // one another or leave a transient invalid JSON file.
        const operation = preferenceWriteQueue.then(async () => {
          const users = await readUsers();
          const user = findById(users, userId);
          if (!user) {
            throw new Error("Session user no longer exists.");
          }

          user.preferences = {
            ...defaultPreferences,
            ...(user.preferences ?? {}),
          };
          for (const [key, value] of entries) {
            user.preferences[key] = value as string;
          }
          await writeUsers(users);
          return { preferences: user.preferences };
        });
        preferenceWriteQueue = operation.then(
          () => undefined,
          () => undefined,
        );
        return await operation;
      } catch (error) {
        request.log.error(
          { err: error, userId, keys: entries.map(([key]) => key) },
          "Unable to save user preferences",
        );
        return reply
          .code(
            error instanceof Error &&
              error.message === "Session user no longer exists."
              ? 401
              : 500,
          )
          .send({
            message:
              error instanceof Error &&
              error.message === "Session user no longer exists."
                ? error.message
                : "Unable to save preferences.",
          });
      }
    },
  );

  app.get("/auth/collaboration/users", async (request, reply) => {
    const currentUserId = getSession(request).userId;
    if (!currentUserId)
      return reply.code(401).send({ message: "Not authenticated." });
    const users = await readUsers();
    const onlineIds = new Set(
      [...collaborationClients.values()].map((client) => client.userId),
    );
    return {
      users: users
        .filter(
          (user) => user.id !== "guest-intern" && user.id !== currentUserId,
        )
        .map((user) => ({
          userId: user.id,
          id: user.id,
          hostname: user.hostname,
          displayName: user.displayName,
          role: user.role,
          online: onlineIds.has(user.id),
        })),
    };
  });

  // WebSocket /api/auth/socket: one authenticated channel for device activity.
  app.get("/auth/socket", { websocket: true }, (socket, request) => {
    const userId = getSession(request).userId;
    if (!userId) {
      socket.close(1008, "Authentication required");
      return;
    }

    const session = getSession(request);
    let deviceId = session.deviceId ?? "pending-device";
    const savedOwnerUserId = session.collaborationOwnerUserId;
    const restoredPermission = savedOwnerUserId
      ? sharedSessions.get(savedOwnerUserId)?.get(userId)
      : undefined;
    const restoredOwnerUserId = restoredPermission
      ? savedOwnerUserId
      : undefined;
    if (savedOwnerUserId && !restoredOwnerUserId) {
      delete session.collaborationOwnerUserId;
      delete session.collaborationPermission;
      void saveSession(request);
    }
    const clientKey = `${userId}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
    const client: CollaborationClient = {
      socket,
      request,
      userId,
      displayName: userId,
      role: session.role ?? "intern",
      joinedOwnerUserId: restoredOwnerUserId,
      permission: restoredOwnerUserId ? restoredPermission : undefined,
    };
    collaborationClients.set(clientKey, client);
    void readUsers()
      .then(async (users) => {
        const user = findById(users, userId);
        if (user) {
          client.displayName = user.displayName;
          client.role = user.role;
        }
        broadcastPresence();
        if (
          client.joinedOwnerUserId &&
          client.permission &&
          socket.readyState === 1
        ) {
          const owner = findById(users, client.joinedOwnerUserId);
          const workspaces = await readWorkspaces();
          const workspace = liveWorkspaces.get(client.joinedOwnerUserId) ??
            workspaces[client.joinedOwnerUserId] ?? { openApps: [] };
          socket.send(
            JSON.stringify({
              type: "join-approved",
              ownerUserId: client.joinedOwnerUserId,
              ownerDisplayName: owner?.displayName ?? client.joinedOwnerUserId,
              permission: client.permission,
              workspace,
            }),
          );
        }
        const ownerMembers = sharedSessions.get(userId);
        if (ownerMembers?.size) {
          socket.send(
            JSON.stringify({
              type: "shared-members",
              ownerUserId: userId,
              members: [...ownerMembers.entries()].map(
                ([memberUserId, permission]) => ({
                  userId: memberUserId,
                  permission,
                  displayName:
                    [...collaborationClients.values()].find(
                      (entry) => entry.userId === memberUserId,
                    )?.displayName ?? memberUserId,
                }),
              ),
            }),
          );
        }
      })
      .catch((error) =>
        request.log.warn(
          { err: error },
          "Unable to resolve collaboration profile",
        ),
      );
    broadcastPresence();

    const persistActivity = async (active: boolean) => {
      try {
        const user = findById(await readUsers(), userId);
        if (!user) {
          socket.close(1008, "Session user no longer exists");
          return;
        }
        const sessions = await readSessions();
        const assignedDeviceSession = Object.values(sessions).find(
          (record) => record.deviceId === deviceId,
        );
        if (assignedDeviceSession && assignedDeviceSession.userId !== userId) {
          socket.close(1008, "A different user is assigned to this device");
          return;
        }
        const existing =
          sessions[`${user.id}:${deviceId}`] ?? sessions[user.id];
        await updateSessionRecord(
          user,
          {
            active,
            activeApps: existing?.activeApps ?? [],
            lastActivityAt: active
              ? Date.now()
              : (existing?.lastActivityAt ?? Date.now()),
          },
          deviceId === "pending-device" ? user.hostname : deviceId,
        );
      } catch (error) {
        request.log.error(error, "Unable to persist WebSocket activity");
      }
    };

    const resetInactivityTimer = () => {
      if (deviceId === "pending-device") return;

      const timerKey = `${userId}:${deviceId}`;
      const existingTimer = deviceInactivityTimers.get(timerKey);
      if (existingTimer) clearTimeout(existingTimer);
      const timer = setTimeout(
        async () => {
          deviceInactivityTimers.delete(timerKey);
          try {
            const sessions = await readSessions();
            const assignedDeviceSession = Object.values(sessions).find(
              (record) => record.deviceId === deviceId,
            );
            if (
              assignedDeviceSession &&
              assignedDeviceSession.userId !== userId
            ) {
              return;
            }
          } catch (error) {
            request.log.error(
              error,
              "Unable to verify device assignment before inactivity update",
            );
            return;
          }
          void persistActivity(false);
        },
        5 * 60 * 1000,
      );
      deviceInactivityTimers.set(timerKey, timer);
    };

    socket.on("message", async (raw: Buffer | ArrayBuffer | Buffer[]) => {
      let message: {
        type?: unknown;
        deviceId?: unknown;
        workspace?: unknown;
        text?: unknown;
        targetUserId?: unknown;
        payload?: unknown;
        x?: unknown;
        y?: unknown;
        roomId?: unknown;
      };
      try {
        message = JSON.parse(raw.toString()) as {
          type?: unknown;
          deviceId?: unknown;
          workspace?: unknown;
          text?: unknown;
          targetUserId?: unknown;
          payload?: unknown;
          x?: unknown;
          y?: unknown;
          roomId?: unknown;
        };
      } catch {
        return;
      }

      if (
        typeof message.deviceId === "string" &&
        /^[a-zA-Z0-9._:-]{8,128}$/.test(message.deviceId)
      ) {
        if (session.deviceId && session.deviceId !== message.deviceId) {
          socket.close(1008, "Device identity mismatch");
          return;
        }
        deviceId = message.deviceId;
        if (!session.deviceId) {
          session.deviceId = deviceId;
          void saveSession(request);
        }
      }
      if (deviceId === "pending-device") return;

      if (message.type === "join-request") {
        if (
          typeof message.targetUserId !== "string" ||
          message.targetUserId === userId
        )
          return;
        const configuredUsers = await readUsers().catch(() => []);
        const configuredTarget = configuredUsers.some(
          (candidate) =>
            candidate.id === message.targetUserId &&
            candidate.id !== "guest-intern",
        );
        if (!configuredTarget) {
          socket.send(
            JSON.stringify({
              type: "join-request-result",
              targetUserId: message.targetUserId,
              status: "not-found",
            }),
          );
          return;
        }
        if (client.joinedOwnerUserId || sharedSessions.has(userId)) {
          socket.send(
            JSON.stringify({
              type: "join-request-result",
              targetUserId: message.targetUserId,
              status: "already-in-session",
            }),
          );
          return;
        }
        const ownerOnline = [...collaborationClients.values()].some(
          (target) =>
            target.userId === message.targetUserId &&
            target.socket.readyState === 1,
        );
        if (!ownerOnline) {
          socket.send(
            JSON.stringify({
              type: "join-request-result",
              targetUserId: message.targetUserId,
              status: "offline",
            }),
          );
          return;
        }
        const existingOwner = [...collaborationClients.values()].find(
          (target) =>
            target.userId === message.targetUserId &&
            target.socket.readyState === 1,
        );
        if (
          existingOwner?.joinedOwnerUserId ||
          sharedSessions.has(message.targetUserId)
        ) {
          socket.send(
            JSON.stringify({
              type: "join-request-result",
              targetUserId: message.targetUserId,
              status: "target-in-session",
            }),
          );
          return;
        }
        pendingJoinRequests.set(`${message.targetUserId}:${userId}`, clientKey);
        sendToUser(message.targetUserId, {
          type: "join-request",
          fromUserId: userId,
          fromDisplayName: client.displayName,
          requestedAt: Date.now(),
        });
        socket.send(
          JSON.stringify({
            type: "join-request-result",
            targetUserId: message.targetUserId,
            status: "pending",
          }),
        );
        return;
      }

      if (message.type === "join-response") {
        if (
          typeof message.targetUserId !== "string" ||
          typeof message.approved !== "boolean"
        )
          return;
        const requestKey = `${userId}:${message.targetUserId}`;
        const requesterKey = pendingJoinRequests.get(requestKey);
        if (!requesterKey) return;
        const permission = message.permission === "editor" ? "editor" : "view";
        if (!message.approved) {
          pendingJoinRequests.delete(requestKey);
          sendToUser(message.targetUserId, {
            type: "join-declined",
            ownerUserId: userId,
            ownerDisplayName: client.displayName,
          });
          return;
        }
        const requester = collaborationClients.get(requesterKey);
        if (!requester || requester.socket.readyState !== 1) {
          pendingJoinRequests.delete(requestKey);
          return;
        }
        if (
          client.joinedOwnerUserId ||
          sharedSessions.has(message.targetUserId)
        ) {
          pendingJoinRequests.delete(requestKey);
          return;
        }
        pendingJoinRequests.delete(requestKey);
        const members =
          sharedSessions.get(userId) ?? new Map<string, "view" | "editor">();
        members.set(message.targetUserId, permission);
        sharedSessions.set(userId, members);
        requester.joinedOwnerUserId = userId;
        requester.permission = permission;
        const requesterSession = getSession(requester.request);
        requesterSession.collaborationOwnerUserId = userId;
        requesterSession.collaborationPermission = permission;
        void saveSession(requester.request);
        for (const ownerClient of collaborationClients.values()) {
          if (
            ownerClient.userId === userId &&
            ownerClient.socket.readyState === 1
          ) {
            ownerClient.socket.send(
              JSON.stringify({
                type: "shared-session-active",
                ownerUserId: userId,
                memberUserId: message.targetUserId,
                memberDisplayName: requester.displayName,
                permission,
              }),
            );
          }
        }
        const users = await readUsers();
        const workspaces = await readWorkspaces();
        const workspace = liveWorkspaces.get(userId) ??
          workspaces[userId] ?? { openApps: [] };
        requester.socket.send(
          JSON.stringify({
            type: "join-approved",
            ownerUserId: userId,
            ownerDisplayName: client.displayName,
            permission,
            workspace,
          }),
        );
        const memberPayload = {
          type: "shared-members",
          ownerUserId: userId,
          members: [...members.entries()].map(
            ([memberUserId, memberPermission]) => ({
              userId: memberUserId,
              permission: memberPermission,
              displayName:
                findById(users, memberUserId)?.displayName ?? memberUserId,
            }),
          ),
        };
        sendToUser(userId, memberPayload);
        sendToUser(message.targetUserId, {
          type: "shared-session-owner",
          ownerUserId: userId,
          ownerDisplayName: client.displayName,
        });
        return;
      }

      if (message.type === "join-leave") {
        const ownerUserId = client.joinedOwnerUserId;
        if (!ownerUserId) return;
        sharedSessions.get(ownerUserId)?.delete(userId);
        for (const target of collaborationClients.values()) {
          if (target.userId === userId) {
            target.joinedOwnerUserId = undefined;
            target.permission = undefined;
            const targetSession = getSession(target.request);
            delete targetSession.collaborationOwnerUserId;
            delete targetSession.collaborationPermission;
            void saveSession(target.request);
          }
        }
        sendToUser(ownerUserId, {
          type: "shared-member-left",
          userId,
          displayName: client.displayName,
        });
        socket.send(JSON.stringify({ type: "join-left" }));
        return;
      }

      if (message.type === "shared-permission" && sharedSessions.has(userId)) {
        if (
          typeof message.targetUserId !== "string" ||
          (message.permission !== "view" && message.permission !== "editor")
        )
          return;
        const members = sharedSessions.get(userId);
        if (!members?.has(message.targetUserId)) return;
        members.set(message.targetUserId, message.permission);
        for (const target of collaborationClients.values()) {
          if (
            target.userId === message.targetUserId &&
            target.joinedOwnerUserId === userId
          ) {
            target.permission = message.permission;
            const targetSession = getSession(target.request);
            targetSession.collaborationPermission = message.permission;
            void saveSession(target.request);
          }
        }
        sendToUser(message.targetUserId, {
          type: "shared-permission",
          ownerUserId: userId,
          permission: message.permission,
        });
        return;
      }

      if (message.type === "shared-workspace-command") {
        const ownerUserId = client.joinedOwnerUserId;
        const allowedCommands = new Set([
          "open-app",
          "close-app",
          "focus-app",
          "window-state",
          "workspace",
        ]);
        if (
          !ownerUserId ||
          client.permission !== "editor" ||
          typeof message.command !== "string" ||
          !allowedCommands.has(message.command)
        )
          return;
        sendToUser(ownerUserId, {
          type: "shared-workspace-command",
          fromUserId: userId,
          fromDisplayName: client.displayName,
          command: message.command,
          payload: message.payload,
          permission: client.permission,
        });
        return;
      }

      if (message.type === "shared-workspace-state") {
        const ownerUserId = client.joinedOwnerUserId;
        if (!ownerUserId || client.permission !== "editor") return;
        const workspace = message.workspace;
        if (
          !workspace ||
          typeof workspace !== "object" ||
          Array.isArray(workspace)
        )
          return;
        sendToUser(ownerUserId, {
          type: "shared-workspace-command",
          fromUserId: userId,
          fromDisplayName: client.displayName,
          command: "workspace",
          payload: workspace,
          permission: client.permission,
        });
        return;
      }

      if (message.type === "chat") {
        if (typeof message.text !== "string" || !message.text.trim()) return;
        const text = message.text.trim().slice(0, 2000);
        broadcastCollaboration(
          JSON.stringify({
            type: "chat",
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            userId,
            displayName: client.displayName,
            text,
            timestamp: Date.now(),
            roomId:
              typeof message.roomId === "string"
                ? message.roomId.slice(0, 128)
                : "global",
          }),
        );
        return;
      }

      if (message.type === "cursor") {
        if (typeof message.x !== "number" || typeof message.y !== "number")
          return;
        const ownerUserId = sharedOwnerFor(client);
        if (!ownerUserId) return;
        sendToSharedSession(
          ownerUserId,
          {
            type: "cursor",
            userId,
            displayName: client.displayName,
            x: Math.max(0, Math.min(1, message.x)),
            y: Math.max(0, Math.min(1, message.y)),
            timestamp: Date.now(),
          },
          userId,
        );
        return;
      }

      if (message.type === "annotation-state") {
        const ownerUserId = client.joinedOwnerUserId ?? userId;
        if (client.joinedOwnerUserId && client.permission !== "editor") return;
        const payload = {
          type: "annotation-state",
          ownerUserId,
          fromUserId: userId,
          fromDisplayName: client.displayName,
          payload: message.payload,
          timestamp: Date.now(),
        };
        sendToSharedSession(ownerUserId, payload, userId);
        return;
      }

      if (message.type === "screen-share-request") {
        if (typeof message.targetUserId !== "string") return;
        const forwarded = JSON.stringify({
          type: "screen-share-request",
          fromUserId: userId,
          fromDisplayName: client.displayName,
          timestamp: Date.now(),
        });
        for (const target of collaborationClients.values()) {
          if (
            target.userId === message.targetUserId &&
            target.socket.readyState === 1
          ) {
            target.socket.send(forwarded);
          }
        }
        return;
      }

      if (message.type === "screen-share-signal") {
        if (typeof message.targetUserId !== "string") return;
        const forwarded = JSON.stringify({
          type: "screen-share-signal",
          fromUserId: userId,
          fromDisplayName: client.displayName,
          payload: message.payload,
        });
        for (const target of collaborationClients.values()) {
          if (
            target.userId === message.targetUserId &&
            target.socket.readyState === 1
          ) {
            target.socket.send(forwarded);
          }
        }
        return;
      }
      if (
        message.type === "workspace" &&
        typeof message.workspace === "object" &&
        message.workspace !== null &&
        !Array.isArray(message.workspace)
      ) {
        if (client.joinedOwnerUserId) {
          if (client.permission === "editor") {
            sendToUser(client.joinedOwnerUserId, {
              type: "shared-workspace-command",
              fromUserId: userId,
              fromDisplayName: client.displayName,
              command: "workspace",
              payload: message.workspace,
              permission: client.permission,
            });
          }
          return;
        }
        const persistWorkspace = workspaceUpdateQueue.then(async () => {
          try {
            const sessions = await readSessions();
            const assigned = Object.values(sessions).find(
              (record) => record.deviceId === deviceId,
            );
            if (assigned && assigned.userId !== userId) {
              socket.close(1008, "A different user is assigned to this device");
              return;
            }
            const snapshot = message.workspace as WorkspaceState;
            liveWorkspaces.set(userId, snapshot);
            const workspaces = await readWorkspaces();
            workspaces[userId] = snapshot;
            await writeFile(
              workspacesFilePath,
              `${JSON.stringify({ workspaces }, null, 2)}\n`,
              "utf8",
            );
            const members = sharedSessions.get(userId);
            if (members?.size) {
              sendToSharedSession(
                userId,
                {
                  type: "shared-workspace",
                  ownerUserId: userId,
                  ownerDisplayName: client.displayName,
                  workspace: message.workspace,
                },
                userId,
              );
            }
          } catch (error) {
            request.log.error(
              error,
              "Unable to persist workspace state over WebSocket",
            );
          }
        });
        workspaceUpdateQueue = persistWorkspace;
        void persistWorkspace;
        return;
      }

      if (message.type !== "activity") return;
      resetInactivityTimer();
      void persistActivity(true);
    });

    socket.on("close", () => {
      collaborationClients.delete(clientKey);
      const otherUserClients = [...collaborationClients.values()].filter(
        (entry) => entry.userId === userId,
      );
      if (otherUserClients.length === 0) {
        if (client.joinedOwnerUserId) {
          sharedSessions.get(client.joinedOwnerUserId)?.delete(userId);
          sendToUser(client.joinedOwnerUserId, {
            type: "shared-member-left",
            userId,
            displayName: client.displayName,
          });
          delete session.collaborationOwnerUserId;
          delete session.collaborationPermission;
          void saveSession(request);
        }
        const ownerMembers = sharedSessions.get(userId);
        if (ownerMembers) {
          for (const memberId of ownerMembers.keys()) {
            sendToUser(memberId, {
              type: "shared-session-ended",
              ownerUserId: userId,
            });
            for (const target of collaborationClients.values()) {
              if (target.userId === memberId) {
                target.joinedOwnerUserId = undefined;
                target.permission = undefined;
                const targetSession = getSession(target.request);
                delete targetSession.collaborationOwnerUserId;
                delete targetSession.collaborationPermission;
                void saveSession(target.request);
              }
            }
          }
          sharedSessions.delete(userId);
        }
        for (const key of pendingJoinRequests.keys()) {
          if (key.startsWith(`${userId}:`) || key.endsWith(`:${userId}`))
            pendingJoinRequests.delete(key);
        }
      }
      broadcastPresence();
      // Keep the device active during transient reconnects; mark it inactive only
      // after the shared per-device inactivity timer expires.
      resetInactivityTimer();
    });
    socket.on("error", (error: Error) => {
      request.log.warn({ err: error }, "Device activity WebSocket error");
    });

    socket.send(JSON.stringify({ type: "connected" }));
  });

  app.post<{
    Body: { hostname?: string; displayName?: string; password?: string };
  }>("/lockscreen/register", async (request, reply) => {
    const hostname =
      typeof request.body?.hostname === "string"
        ? request.body.hostname.trim()
        : "";
    const displayName =
      typeof request.body?.displayName === "string"
        ? request.body.displayName.trim()
        : "";
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{1,127}$/.test(hostname))
      return reply.code(400).send({ message: "Enter a valid device host ID." });
    if (displayName.length < 2 || displayName.length > 80)
      return reply
        .code(400)
        .send({ message: "Enter your name (2–80 characters)." });
    const password =
      typeof request.body?.password === "string" ? request.body.password : "";
    if (password.length < 8 || password.length > 1024)
      return reply
        .code(400)
        .send({ message: "Create a password with at least 8 characters." });
    try {
      const users = await readUsers();
      const existing = findByHostname(users, hostname);
      if (existing)
        return reply.code(409).send({
          message:
            "This device host ID is already registered. Enter the ID assigned to this profile.",
        });
      const user: InternUser = {
        id: hostname,
        hostname,
        displayName,
        password,
        deviceId: hostname,
        role: "intern",
        // New profiles are explicitly initialized with the default wallpaper.
        preferences: {
          ...defaultPreferences,
          "utoolity.wallpaper": "Default",
        },
      };
      await writeUsers([...users, user]);
      await establishSession(request, user);
      await updateSessionRecord(
        user,
        { active: true, activeApps: [], lastActivityAt: Date.now() },
        hostname,
      );
      return reply.code(201).send({
        success: true,
        user: {
          ...publicUser(user),
          preferences: { ...defaultPreferences, ...(user.preferences ?? {}) },
        },
      });
    } catch (error) {
      request.log.error(error, "Unable to register this device profile");
      return reply
        .code(500)
        .send({ message: "Unable to save this device profile." });
    }
  });

  // Resolve the lock-screen identity from the persistent device ID first.
  // A previously assigned hostname remains supported for existing installs.
  app.get<{
    Querystring: { hostname?: string };
  }>("/lockscreen/me", async (request, reply) => {
    const hostname = request.query.hostname?.trim();

    if (hostname && hostname.length > 255) {
      return reply.code(400).send({ message: "Invalid hostname." });
    }

    try {
      const users = await readUsers();
      const deviceId = getDeviceId(request, "");
      let user: InternUser | undefined;

      if (deviceId) {
        user = users.find((candidate) => candidate.deviceId === deviceId);
      }

      if (!user && hostname) user = findByHostname(users, hostname);

      if (!user && deviceId) {
        const sessions = await readSessions();
        const matches = Object.values(sessions).filter(
          (session) => session.deviceId === deviceId,
        );
        const assignedIds = [
          ...new Set(matches.map((session) => session.userId)),
        ];
        if (assignedIds.length === 1) user = findById(users, assignedIds[0]);
      }

      if (!user) {
        return { requiresDeviceId: true };
      }

      return {
        user: {
          ...publicUser(user),
          preferences: { ...defaultPreferences, ...(user.preferences ?? {}) },
          locked: true,
        },
      };
    } catch (error) {
      request.log.error(error, "Unable to load lockscreen profile");
      return reply
        .code(500)
        .send({ message: "Unable to load the device profile." });
    }
  });

  // POST /api/lockscreen/unlock
  app.post<{ Body: CredentialsBody }>(
    "/lockscreen/unlock",
    async (request, reply) => {
      if (!validCredentials(request.body)) {
        return reply.code(400).send({
          message: "A valid hostname and password are required.",
        });
      }

      try {
        const users = await readUsers();
        const deviceId = getDeviceId(request, "");
        const assignedUser = deviceId
          ? users.find((candidate) => candidate.deviceId === deviceId)
          : undefined;
        const user =
          assignedUser ?? findByHostname(users, request.body.hostname);

        if (
          !user ||
          user.hostname.toLowerCase() !==
            request.body.hostname.trim().toLowerCase() ||
          user.password !== request.body.password
        ) {
          return reply.code(401).send({
            message: "Incorrect password.",
          });
        }

        await establishSession(request, user);
        await updateSessionRecord(
          user,
          {
            active: true,
            activeApps: [],
            lastActivityAt: Date.now(),
          },
          user.deviceId ?? user.hostname,
        );

        return {
          success: true,
          user: {
            ...publicUser(user),
            preferences: { ...defaultPreferences, ...(user.preferences ?? {}) },
          },
        };
      } catch (error) {
        request.log.error(error, "Lockscreen authentication failed");

        return reply.code(500).send({
          message: "Unable to verify the password.",
        });
      }
    },
  );
}
