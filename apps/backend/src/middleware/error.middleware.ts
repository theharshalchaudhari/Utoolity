import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";

export function errorMiddleware(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  const requestId =
    (request.headers["x-request-id"] as string | undefined)?.slice(0, 128) ??
    request.id;
  const statusCode =
    typeof error.statusCode === "number" &&
    error.statusCode >= 400 &&
    error.statusCode <= 599
      ? error.statusCode
      : 500;

  request.log.error(
    { err: error, requestId, method: request.method, url: request.url },
    "Request failed",
  );

  if (reply.sent) return;

  const safeStack =
    process.env.NODE_ENV === "production" || statusCode < 500
      ? undefined
      : error.stack?.slice(0, 8000);

  reply.code(statusCode).send({
    message: statusCode >= 500 ? "Internal server error." : error.message,
    code: error.code,
    requestId,
    ...(safeStack ? { stack: safeStack } : {}),
  });
}
