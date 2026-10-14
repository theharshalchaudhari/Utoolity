import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

type InternUser = {
  id: string;
  hostname: string;
  displayName: string;
  password: string;
  macId: string;
  role: "intern";
  preferences?: Record<string, string>;
};

type CredentialsBody = {
  hostname?: string;
  password?: string;
};

type PublicUser = Pick<
  InternUser,
  "id" | "hostname" | "displayName" | "role"
>;

type AuthSession = {
  userId?: string;
  role?: "intern";
  lastActivityAt?: number;
  save(callback: (error?: Error) => void): void;
  destroy(callback: (error?: Error) => void): void;
};

type WorkspaceState = Record<string, unknown>;

type SessionRecord = {
  userId: string;
  hostname: string;
  displayName: string;
  deviceId: string;
  role: "intern";
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
  "utoolity.wallpaper": "default.jpg",
  "utoolity.icon-size": "large",
};

const usersFilePath = fileURLToPath(
  new URL("../data/users.json", import.meta.url),
);
const workspacesFilePath = fileURLToPath(
  new URL("../data/workspaces.json", import.meta.url),
);
const sessionsFilePath = fileURLToPath(
  new URL("../data/sessions.json", import.meta.url),
);

function getSession(request: FastifyRequest): AuthSession {
  return (request as FastifyRequest & { session: AuthSession }).session;
}

async function readJsonFile<T>(path: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return fallback;
    }
    throw error;
  }
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

  return parsed.users as InternUser[];
}

async function writeUsers(users: InternUser[]): Promise<void> {
  await writeFile(
    usersFilePath,
    `${JSON.stringify({ users }, null, 2)}\n`,
    "utf8",
  );
}

async function readSessions(): Promise<Record<string, SessionRecord>> {
  const raw = await readJsonFile<{ sessions?: Record<string, SessionRecord> }>(
    sessionsFilePath,
    { sessions: {} },
  );
  return raw.sessions ?? {};
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

async function updateSessionRecord(
  user: InternUser,
  values: Pick<SessionRecord, "active" | "activeApps" | "lastActivityAt">,
): Promise<void> {
  const sessions = await readSessions();
  sessions[user.id] = {
    userId: user.id,
    hostname: user.hostname,
    displayName: user.displayName,
    deviceId: user.macId,
    role: user.role,
    ...values,
    updatedAt: Date.now(),
  };
  await writeSessions(sessions);
}

async function readWorkspaces(): Promise<Record<string, WorkspaceState>> {
  const raw = await readJsonFile<{ workspaces?: Record<string, WorkspaceState> }>(
    workspacesFilePath,
    { workspaces: {} },
  );
  return raw.workspaces ?? {};
}

function publicUser(user: InternUser): PublicUser {
  return {
    id: user.id,
    hostname: user.hostname,
    displayName: user.displayName,
    role: user.role,
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
      if (error) reject(error);
      else resolve();
    });
  });
}

function destroySession(request: FastifyRequest): Promise<void> {
  return new Promise((resolve, reject) => {
    getSession(request).destroy((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

async function establishSession(
  request: FastifyRequest,
  user: InternUser,
): Promise<void> {
  const session = getSession(request);
  session.userId = user.id;
  session.role = user.role;
  session.lastActivityAt = Date.now();
  await saveSession(request);
}

async function requireSessionUser(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<InternUser | undefined> {
  const userId = getSession(request).userId;

  if (!userId) {
    reply.code(401).send({ message: "Not authenticated." });
    return undefined;
  }

  const user = findById(await readUsers(), userId);
  if (!user) {
    await destroySession(request);
    reply.header(
      "Set-Cookie",
      "sessionId=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax",
    );
    reply.code(401).send({ message: "Session user no longer exists." });
    return undefined;
  }

  return user;
}

export default async function authRoutes(app: FastifyInstance) {
  app.get("/auth/workspace", async (request, reply) => {
    try {
      const user = await requireSessionUser(request, reply);
      if (!user) return;

      const workspaces = await readWorkspaces();
      return { workspace: workspaces[user.id] ?? {} };
    } catch (error) {
      request.log.error(error, "Unable to load workspace");
      return reply.code(500).send({ message: "Unable to load workspace." });
    }
  });

  app.put<{ Body: WorkspaceState }>("/auth/workspace", async (request, reply) => {
    try {
      const user = await requireSessionUser(request, reply);
      if (!user) return;

      const workspaces = await readWorkspaces();
      workspaces[user.id] = request.body ?? {};
      await writeFile(
        workspacesFilePath,
        `${JSON.stringify({ workspaces }, null, 2)}\n`,
        "utf8",
      );

      const activeApps = Array.isArray(request.body?.openApps)
        ? request.body.openApps
        : [];
      await updateSessionRecord(user, {
        active: true,
        activeApps,
        lastActivityAt: Date.now(),
      });
      return { success: true };
    } catch (error) {
      request.log.error(error, "Unable to save workspace");
      return reply.code(500).send({ message: "Unable to save workspace." });
    }
  });

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
        await updateSessionRecord(user, {
          active: true,
          activeApps: sessions[user.id]?.activeApps ?? [],
          lastActivityAt: session.lastActivityAt,
        });
      }
      await saveSession(request);
      return { success: true, lastActivityAt: session.lastActivityAt };
    } catch (error) {
      request.log.error(error, "Unable to persist session activity");
      return reply.code(500).send({ message: "Unable to update session activity." });
    }
  });

  app.post<{ Body: CredentialsBody }>("/auth/login", async (request, reply) => {
    if (!validCredentials(request.body)) {
      return reply.code(400).send({
        message: "A valid hostname and password are required.",
      });
    }

    try {
      const user = findByHostname(await readUsers(), request.body.hostname);
      if (!user || user.password !== request.body.password) {
        return reply.code(401).send({ message: "Invalid hostname or password." });
      }

      await establishSession(request, user);
      await updateSessionRecord(user, {
        active: true,
        activeApps: [],
        lastActivityAt: Date.now(),
      });
      return { user: publicUser(user) };
    } catch (error) {
      request.log.error(error, "Login failed unexpectedly");
      return reply.code(500).send({ message: "Unable to sign in right now." });
    }
  });

  app.post("/auth/logout", async (request, reply) => {
    try {
      const session = getSession(request);
      if (session.userId) {
        const user = findById(await readUsers(), session.userId);
        if (user) {
          await updateSessionRecord(user, {
            active: false,
            activeApps: [],
            lastActivityAt: Date.now(),
          });
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
      return reply.code(500).send({ message: "Unable to sign out right now." });
    }
  });

  app.get("/auth/me", async (request, reply) => {
    try {
      const user = await requireSessionUser(request, reply);
      if (!user) return;
      return { user: publicUser(user) };
    } catch (error) {
      request.log.error(error, "Unable to load current user");
      return reply.code(500).send({ message: "Unable to load the current user." });
    }
  });

  app.get("/auth/preferences", async (request, reply) => {
    try {
      const user = await requireSessionUser(request, reply);
      if (!user) return;

      return {
        preferences: {
          ...defaultPreferences,
          ...(user.preferences ?? {}),
        },
      };
    } catch (error) {
      request.log.error(error, "Unable to load user preferences");
      return reply.code(500).send({ message: "Unable to load preferences." });
    }
  });

  app.patch<{ Body: Record<string, unknown> }>(
    "/auth/preferences",
    async (request, reply) => {
      const user = await requireSessionUser(request, reply);
      if (!user) return;

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
        const users = await readUsers();
        const currentUser = findById(users, user.id);
        if (!currentUser) {
          return reply.code(401).send({ message: "Session user no longer exists." });
        }

        currentUser.preferences = {
          ...defaultPreferences,
          ...(currentUser.preferences ?? {}),
        };
        for (const [key, value] of entries) {
          currentUser.preferences[key] = value as string;
        }
        await writeUsers(users);
        return { preferences: currentUser.preferences };
      } catch (error) {
        request.log.error(error, "Unable to save user preferences");
        return reply.code(500).send({ message: "Unable to save preferences." });
      }
    },
  );

  app.get<{ Querystring: { hostname?: string } }>(
    "/lockscreen/me",
    async (request, reply) => {
      const hostname = request.query.hostname?.trim();

      if (!hostname || hostname.length > 255) {
        return reply.code(400).send({ message: "A valid hostname is required." });
      }

      try {
        const user = findByHostname(await readUsers(), hostname);

        if (!user) {
          const guest = findById(await readUsers(), "guest-intern");
          if (!guest) {
            return reply.code(404).send({ message: "This workstation is not registered." });
          }
          return { user: { ...publicUser(guest), locked: true } };
        }

        return { user: { ...publicUser(user), locked: true } };
      } catch (error) {
        request.log.error(error, "Unable to load lockscreen profile");
        return reply.code(500).send({ message: "Unable to load the device profile." });
      }
    },
  );

  app.post<{ Body: CredentialsBody }>("/lockscreen/unlock", async (request, reply) => {
    if (!validCredentials(request.body)) {
      return reply.code(400).send({
        message: "A valid hostname and password are required.",
      });
    }

    try {
      const user = findByHostname(await readUsers(), request.body.hostname);
      if (!user || user.password !== request.body.password) {
        return reply.code(401).send({ message: "Incorrect hostname or password." });
      }

      await establishSession(request, user);
      await updateSessionRecord(user, {
        active: true,
        activeApps: [],
        lastActivityAt: Date.now(),
      });

      return { success: true, user: publicUser(user) };
    } catch (error) {
      request.log.error(error, "Lockscreen authentication failed");
      return reply.code(500).send({ message: "Unable to verify the password." });
    }
  });
}
