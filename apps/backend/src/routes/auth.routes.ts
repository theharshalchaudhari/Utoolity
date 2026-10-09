
import type { FastifyInstance, FastifyRequest } from "fastify";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

type InternUser = {
  id: string;
  hostname: string;
  displayName: string;
  password: string;
  macId: string;
  role: "intern";
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
>;

type AuthSession = {
  userId?: string;
  role?: "intern";
  save(callback: (error?: Error) => void): void;
  destroy(callback: (error?: Error) => void): void;
};

function getSession(request: FastifyRequest): AuthSession {
  return (request as FastifyRequest & { session: AuthSession }).session;
}

const usersFilePath = fileURLToPath(
  new URL("../data/users.json", import.meta.url),
);

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
    (user) =>
      user.hostname.trim().toLowerCase() === normalizedHostname,
  );
}

function findById(
  users: InternUser[],
  id: string,
): InternUser | undefined {
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
  session.role = user.role;

  await saveSession(request);
}

export default async function authRoutes(app: FastifyInstance) {
  // POST /api/auth/login
  app.post<{ Body: CredentialsBody }>(
    "/auth/login",
    async (request, reply) => {
      if (!validCredentials(request.body)) {
        return reply.code(400).send({
          message: "A valid hostname and password are required.",
        });
      }

      try {
        const users = await readUsers();
        const user = findByHostname(users, request.body.hostname);

        if (!user || user.password !== request.body.password) {
          return reply.code(401).send({
            message: "Invalid hostname or password.",
          });
        }

        await establishSession(request, user);

        return {
          user: publicUser(user),
        };
      } catch (error) {
        request.log.error(error, "Login failed unexpectedly");

        return reply.code(500).send({
          message: "Unable to sign in right now.",
        });
      }
    },
  );

  // POST /api/auth/logout
  app.post("/auth/logout", async (request, reply) => {
    try {
      await destroySession(request);
      reply.header("Set-Cookie", "sessionId=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax");

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

  // GET /api/lockscreen/me?hostname=L-MHP-IXMT2
  app.get<{
    Querystring: { hostname?: string };
  }>("/lockscreen/me", async (request, reply) => {
    const hostname = request.query.hostname?.trim();

    if (!hostname || hostname.length > 255) {
      return reply.code(400).send({
        message: "A valid hostname is required.",
      });
    }

    try {
      const users = await readUsers();
      const user = findByHostname(users, hostname);

      if (!user) {
        return {
          user: {
            id: "guest",
            hostname,
            displayName: "Guest",
            role: "intern" as const,
            locked: true,
          },
        };
      }

      return {
        user: {
          ...publicUser(user),
          locked: true,
        },
      };
    } catch (error) {
      request.log.error(error, "Unable to load lockscreen profile");

      return reply.code(500).send({
        message: "Unable to load the device profile.",
      });
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
        const user = findByHostname(users, request.body.hostname);

        if (!user || user.password !== request.body.password) {
          return reply.code(401).send({
            message: "Incorrect password.",
          });
        }

        await establishSession(request, user);

        return {
          success: true,
          user: publicUser(user),
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
