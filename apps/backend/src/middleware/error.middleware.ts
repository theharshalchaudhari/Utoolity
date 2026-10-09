
import type {
  FastifyError,
  FastifyReply,
  FastifyRequest,
} from "fastify";

export function errorMiddleware(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  request.log.error({ err: error }, "Request failed");

  if (reply.sent) {
    return;
  }

  const statusCode =
    typeof error.statusCode === "number" &&
    error.statusCode >= 400 &&
    error.statusCode <= 599
      ? error.statusCode
      : 500;

  reply.code(statusCode).send({
    message:
      statusCode >= 500
        ? "Internal server error."
        : error.message,
  });
}
