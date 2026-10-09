
import "dotenv/config";

import app from "./app.js";

const port = Number(process.env.BACKEND_PORT ?? 4000);
const host = process.env.BACKEND_HOST ?? "0.0.0.0";

try {
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(
      `Invalid BACKEND_PORT "${process.env.BACKEND_PORT}". Expected an integer between 1 and 65535.`,
    );
  }

  await app.listen({ port, host });

  app.log.info(`Backend server listening on ${host}:${port}`);
} catch (error) {
  app.log.error({ err: error }, "Failed to start the backend server");
  process.exitCode = 1;
}
