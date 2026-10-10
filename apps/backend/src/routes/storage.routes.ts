import type { FastifyInstance, FastifyRequest } from "fastify";
import { createReadStream } from "node:fs";
import { cp, mkdir, readdir, rename, rm, stat, writeFile, readFile } from "node:fs/promises";
import path from "node:path";

type SessionRequest = FastifyRequest & {
  session: { userId?: string };
};

type UserRecord = { id: string; hostname: string; displayName: string };
type PathBody = { path?: string; destination?: string; name?: string };

const storageRoot = path.resolve(process.env.STORAGE_ROOT ?? path.join(process.cwd(), "data"));

function safeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/^-+|-+$/g, "") || "user";
}

function userRoot(user: UserRecord) {
  return path.join(storageRoot, "interns", `${safeSegment(user.displayName)}-${safeSegment(user.hostname)}`);
}

function resolveInside(root: string, relative = "") {
  const resolved = path.resolve(root, relative);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error("Invalid storage path.");
  }
  return resolved;
}

function storageErrorStatus(error: unknown) {
  return error instanceof Error &&
    (error.message === "Not authenticated." ||
      error.message === "Session user no longer exists.")
    ? 401
    : 400;
}

function requestedTarget(user: UserRecord, requested: string) {
  if (requested === "server") return userRoot(user);
  if (requested.startsWith("server/")) {
    return resolveInside(userRoot(user), requested.slice("server/".length));
  }
  return resolveInside(storageRoot, requested);
}

async function getUser(request: FastifyRequest): Promise<UserRecord> {
  const userId = (request as SessionRequest).session.userId;
  if (!userId) throw new Error("Not authenticated.");
  const raw = await import("../data/users.json", { with: { type: "json" } });
  const user = (raw.default.users as UserRecord[]).find((candidate) => candidate.id === userId);
  if (!user) throw new Error("Session user no longer exists.");
  return user;
}

export default async function storageRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { path?: string } }>("/storage/list", async (request, reply) => {
    try {
      const user = await getUser(request);
      const root = userRoot(user);
      const requested = request.query.path ?? "";
      const sharedRoot = path.join(storageRoot, "shared");
      await mkdir(root, { recursive: true });
      await mkdir(sharedRoot, { recursive: true });
      const target = requested.startsWith("users")
        ? resolveInside(path.join(storageRoot, "interns"), requested.slice("users".length).replace(/^\/+/, ""))
        : requestedTarget(user, requested);
      const entries = await readdir(target, { withFileTypes: true });
      return {
        entries: await Promise.all(entries.map(async (entry) => {
          const entryPath = path.relative(storageRoot, path.join(target, entry.name));
          const details = await stat(path.join(target, entry.name));
          return { name: entry.name, path: entryPath, type: entry.isDirectory() ? "directory" : "file", size: details.size };
        })),
      };
    } catch (error) {
      request.log.error(error, "Storage listing failed");
      return reply.code(storageErrorStatus(error)).send({ message: error instanceof Error ? error.message : "Unable to list storage." });
    }
  });

  app.get("/storage/users", async (request, reply) => {
    try {
      const currentUser = await getUser(request);
      const raw = await import("../data/users.json", { with: { type: "json" } });
      return {
        users: (raw.default.users as UserRecord[])
          .filter((user) => user.id !== currentUser.id)
          .map(({ id, displayName, hostname }) => ({ id, displayName, hostname })),
      };
    } catch (error) {
      request.log.error(error, "Storage users lookup failed");
      return reply.code(storageErrorStatus(error)).send({ message: "Unable to load users." });
    }
  });

  app.post<{ Body: { path?: string } }>("/storage/upload", async (request, reply) => {
    try {
      const user = await getUser(request);
      const root = userRoot(user);
      await mkdir(root, { recursive: true });
      const parts = request.parts();
      let requestedPath = "server";
      let rootFolder = "";
      let relativePaths: string[] = [];
      let fileIndex = 0;
      const uploadedEntries: Array<{ name: string; path: string; type: "file"; size: number }> = [];
      for await (const part of parts) {
        if (part.type === "field" && part.fieldname === "path") {
          requestedPath = String(part.value);
          continue;
        }
        if (part.type === "field" && part.fieldname === "rootFolder") {
          rootFolder = String(part.value).replaceAll("\\", "/").replace(/^\/+|\/+$/g, "");
          continue;
        }
        if (part.type === "field" && part.fieldname === "relativePaths") {
          try {
            const parsed = JSON.parse(String(part.value));
            if (Array.isArray(parsed) && parsed.every((value) => typeof value === "string")) {
              relativePaths = parsed;
            }
          } catch {
            throw new Error("Invalid upload paths.");
          }
          continue;
        }
        if (part.type !== "file") continue;
        const target = requestedTarget(user, requestedPath);
        await mkdir(target, { recursive: true });
        const metadataPath = relativePaths[fileIndex++];
        const relativeName = (metadataPath || part.filename)
          .replaceAll("\\", "/")
          .replace(/^\/+/, "");
        const rootedName = rootFolder && !relativeName.startsWith(`${rootFolder}/`)
          ? `${rootFolder}/${relativeName}`
          : relativeName;
        const destination = resolveInside(target, rootedName);
        const content = await part.toBuffer();
        await mkdir(path.dirname(destination), { recursive: true });
        await writeFile(destination, content);
        uploadedEntries.push({
          name: path.basename(destination),
          path: path.relative(storageRoot, destination),
          type: "file",
          size: content.byteLength,
        });
      }
      return { success: true, entries: uploadedEntries };
    } catch (error) {
      request.log.error(error, "Storage upload failed");
      const message = error instanceof Error ? error.message : "Unable to upload.";
      return reply.code(message === "Not authenticated." ? 401 : 400).send({ message });
    }
  });

  app.post<{ Body: { path?: string } }>("/storage/delete", async (request, reply) => {
    try {
      const user = await getUser(request);
      const protectedRoot = userRoot(user);
      const target = requestedTarget(user, request.body?.path ?? "");
      if (target === storageRoot || target === protectedRoot) return reply.code(400).send({ message: "This folder cannot be deleted." });
      await rm(target, { recursive: true, force: false });
      return { success: true };
    } catch (error) {
      request.log.error(error, "Storage delete failed");
      return reply.code(storageErrorStatus(error)).send({ message: error instanceof Error ? error.message : "Unable to delete." });
    }
  });

  app.get<{ Querystring: { path?: string } }>("/storage/download", async (request, reply) => {
    try {
      await getUser(request);
      const target = resolveInside(storageRoot, request.query.path ?? "");
      const details = await stat(target);
      if (!details.isFile()) return reply.code(400).send({ message: "Only files can be downloaded." });
      return reply.send(createReadStream(target));
    } catch (error) {
      request.log.error(error, "Storage download failed");
      return reply.code(storageErrorStatus(error) === 401 ? 401 : 404).send({ message: error instanceof Error && storageErrorStatus(error) === 401 ? error.message : "File not found." });
    }
  });

  app.get<{ Querystring: { path?: string } }>("/storage/content", async (request, reply) => {
    try {
      await getUser(request);
      const target = resolveInside(storageRoot, request.query.path ?? "");
      const details = await stat(target);
      if (!details.isFile() || details.size > 5_000_000) {
        return reply.code(400).send({ message: "This file cannot be opened in Notepad." });
      }
      const { readFile } = await import("node:fs/promises");
      return { content: await readFile(target, "utf8") };
    } catch (error) {
      request.log.error(error, "Storage content read failed");
      return reply.code(storageErrorStatus(error)).send({ message: error instanceof Error ? error.message : "Unable to read file." });
    }
  });

  app.put<{ Body: { path?: string; content?: string } }>("/storage/content", async (request, reply) => {
    try {
      await getUser(request);
      const target = resolveInside(storageRoot, request.body?.path ?? "");
      if (typeof request.body?.content !== "string" || request.body.content.length > 5_000_000) {
        return reply.code(400).send({ message: "Invalid file content." });
      }
      await writeFile(target, request.body.content, "utf8");
      return { success: true };
    } catch (error) {
      request.log.error(error, "Storage content write failed");
      return reply.code(storageErrorStatus(error)).send({ message: error instanceof Error ? error.message : "Unable to save file." });
    }
  });

  app.get<{ Params: { tool: string } }>("/storage/progress/:tool", async (request, reply) => {
    try {
      const user = await getUser(request);
      const tool = safeSegment(request.params.tool);
      const progressPath = resolveInside(userRoot(user), `.progress-${tool}.json`);
      try {
        return JSON.parse(await readFile(progressPath, "utf8"));
      } catch {
        return { progress: {} };
      }
    } catch (error) {
      request.log.error(error, "Tool progress read failed");
      return reply.code(401).send({ message: "Unable to load tool progress." });
    }
  });

  app.put<{ Params: { tool: string }; Body: { progress?: Record<string, unknown> } }>("/storage/progress/:tool", async (request, reply) => {
    try {
      const user = await getUser(request);
      const progress = request.body?.progress;
      if (!progress || typeof progress !== "object") return reply.code(400).send({ message: "Invalid progress payload." });
      await mkdir(userRoot(user), { recursive: true });
      await writeFile(resolveInside(userRoot(user), `.progress-${safeSegment(request.params.tool)}.json`), JSON.stringify({ progress }), "utf8");
      return { success: true };
    } catch (error) {
      request.log.error(error, "Tool progress write failed");
      return reply.code(storageErrorStatus(error)).send({ message: "Unable to save tool progress." });
    }
  });

  app.post<{ Body: PathBody }>("/storage/mkdir", async (request, reply) => {
    try {
      const user = await getUser(request);
      const target = requestedTarget(user, request.body?.path ?? "server");
      await mkdir(target, { recursive: true });
      return { success: true };
    } catch (error) {
      request.log.error(error, "Storage folder creation failed");
      return reply.code(storageErrorStatus(error)).send({ message: error instanceof Error ? error.message : "Unable to create folder." });
    }
  });

  app.post<{ Body: PathBody }>("/storage/rename", async (request, reply) => {
    try {
      await getUser(request);
      const source = resolveInside(storageRoot, request.body?.path ?? "");
      const name = path.basename(request.body?.name ?? "");
      if (!name || name === "." || name === "..") throw new Error("A valid name is required.");
      await rename(source, resolveInside(path.dirname(source), name));
      return { success: true };
    } catch (error) {
      request.log.error(error, "Storage rename failed");
      return reply.code(storageErrorStatus(error)).send({ message: error instanceof Error ? error.message : "Unable to rename." });
    }
  });

  for (const operation of ["copy", "move"] as const) {
    app.post<{ Body: PathBody }>(`/storage/${operation}`, async (request, reply) => {
      try {
        await getUser(request);
        const source = resolveInside(storageRoot, request.body?.path ?? "");
        const destination = resolveInside(storageRoot, request.body?.destination ?? "");
        if (operation === "copy") await cp(source, destination, { recursive: true, errorOnExist: true });
        else await rename(source, destination);
        return { success: true };
      } catch (error) {
        request.log.error(error, `Storage ${operation} failed`);
        return reply.code(storageErrorStatus(error)).send({ message: error instanceof Error ? error.message : `Unable to ${operation}.` });
      }
    });
  }
}
