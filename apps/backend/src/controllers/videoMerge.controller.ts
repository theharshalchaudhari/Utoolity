
import type { FastifyReply, FastifyRequest } from "fastify";
import * as service from "../services/videoMerge.service.js";
import { parseUploadedFiles } from "./uploaded-files.js";

export async function merge(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { files, settings } = await parseUploadedFiles(req, "videos");

    const result = await service.merge(
      files as unknown as Parameters<typeof service.merge>[0],
      settings,
    );

    return reply.send(result);
  } catch (error) {
    req.log.error(error, "Video merge failed");
    return reply.code(500).send({
      error: error instanceof Error ? error.message : "Merge failed.",
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
    req.log.error(error, "Video merge status lookup failed");
    return reply.code(500).send({
      error: error instanceof Error ? error.message : "Unable to get status.",
    });
  }
}
