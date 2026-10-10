
import type { FastifyReply, FastifyRequest } from "fastify";
import * as service from "../services/boundingBox.service.js";
import { parseUploadedFiles } from "./uploaded-files.js";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const storageRoot = path.resolve(process.env.STORAGE_ROOT ?? path.join(process.cwd(), "data"));
const safeSegment = (value: string) => value.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/^-+|-+$/g, "") || "user";
const resolveInside = (root: string, relative: string) => {
  const target = path.resolve(root, relative);
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) throw new Error("Invalid storage path.");
  return target;
};

export async function save(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { files, settings } = await parseUploadedFiles(req, "files");

    const result = await service.save(
      files as unknown as Parameters<typeof service.save>[0],
      settings,
    );

    return reply.send(result);
  } catch (error) {
    req.log.error(error, "Bounding-box upload failed");
    return reply.code(500).send({
      error: error instanceof Error ? error.message : "Upload failed.",
    });
  }
}

export async function getStatus(
  req: FastifyRequest<{ Params: { jobId: string } }>,
  reply: FastifyReply,
) {
  try {
    return reply.send(await service.getStatus(req.params.jobId));
  } catch (error) {
    req.log.error(error, "Bounding-box status lookup failed");
    return reply.code(500).send({
      error: error instanceof Error ? error.message : "Unable to get status.",
    });
  }
}

export async function saveAnnotations(req: FastifyRequest, reply: FastifyReply) {
    try {
      const body = req.body as {
        path?: string;
        imagePath?: string;
        imageWidth?: number;
        imageHeight?: number;
        boxes?: Array<{ label: string; x: number; y: number; width: number; height: number }>;
      };
      const userId = (req as FastifyRequest & { session: { userId?: string } }).session.userId;
      if (!userId) return reply.code(401).send({ message: "Not authenticated." });
      const users = await import("../data/users.json", { with: { type: "json" } });
      const user = (users.default.users as Array<{ id: string; displayName: string; hostname: string }>).find((item) => item.id === userId);
      if (!user) return reply.code(401).send({ message: "Session user no longer exists." });
      if (!body.path || !body.imagePath || !body.imageWidth || !body.imageHeight || !Array.isArray(body.boxes)) {
        return reply.code(400).send({ message: "Invalid bounding-box payload." });
      }
      if (!body.boxes.every((box) => typeof box.label === "string" && [box.x, box.y, box.width, box.height].every(Number.isFinite))) {
        return reply.code(400).send({ message: "Invalid bounding-box coordinates." });
      }
      const imageWidth = body.imageWidth;
      const imageHeight = body.imageHeight;
      const root = path.join(storageRoot, "interns", `${safeSegment(user.displayName)}-${safeSegment(user.hostname)}`);
      const relativePath = body.path.startsWith(path.relative(storageRoot, root))
        ? body.path.slice(path.relative(storageRoot, root).length).replace(/^\/+/, "")
        : body.path.replace(/^server\/?/, "");
      const target = resolveInside(root, relativePath);
      const labelMe = {
        version: "7.0.3", flags: {},
        shapes: body.boxes.map((box) => ({
          label: box.label,
          points: [[box.x, box.y], [box.x + box.width, box.y + box.height]],
          group_id: null, description: "", shape_type: "rectangle", flags: {}, mask: null,
        })),
        imagePath: path.basename(body.imagePath), imageData: null,
        imageHeight, imageWidth,
      };
      const yolo = body.boxes.map((box) => [
        box.label,
        (box.x + box.width / 2) / imageWidth,
        (box.y + box.height / 2) / imageHeight,
        box.width / imageWidth,
        box.height / imageHeight,
      ].map((value) => typeof value === "number" ? value.toFixed(6) : value).join(" ")).join("\n");
      await mkdir(path.dirname(target), { recursive: true });
      await Promise.all([
        writeFile(target.replace(/\.[^/.]+$/, ".json"), JSON.stringify(labelMe, null, 2), "utf8"),
        writeFile(target.replace(/\.[^/.]+$/, ".txt"), yolo, "utf8"),
      ]);
      return reply.send({ success: true });
    } catch (error) {
      req.log.error(error, "Bounding-box annotation save failed");
      return reply.code(400).send({ message: error instanceof Error ? error.message : "Unable to save annotations." });
  }
}
