
import type { FastifyReply, FastifyRequest } from "fastify";
import * as service from "../services/videoTrim.service.js";
import { parseUploadedFiles } from "./uploaded-files.js";

export async function trim(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { files, settings } = await parseUploadedFiles(req, "videos");

    const result = await service.trim(
      files as unknown as Parameters<typeof service.trim>[0],
      settings,
    );

    return reply.send(result);
  } catch (error) {
    req.log.error(error, "Video trimming failed");
    return reply.code(500).send({
      error: error instanceof Error ? error.message : "Trimming failed.",
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
    req.log.error(error, "Video trimming status lookup failed");
    return reply.code(500).send({
      error: error instanceof Error ? error.message : "Unable to get status.",
    });
  }
}
