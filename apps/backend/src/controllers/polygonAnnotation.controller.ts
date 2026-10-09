
import type { FastifyReply, FastifyRequest } from "fastify";
import * as service from "../services/polygonAnnotation.service.js";
import { parseUploadedFiles } from "./uploaded-files.js";

export async function save(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { files, settings } = await parseUploadedFiles(req, "images");

    const result = await service.save(
      files as unknown as Parameters<typeof service.save>[0],
      settings,
    );

    return reply.send(result);
  } catch (error) {
    req.log.error(error, "Polygon annotation upload failed");
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
    req.log.error(error, "Polygon annotation status lookup failed");
    return reply.code(500).send({
      error: error instanceof Error ? error.message : "Unable to get status.",
    });
  }
}
