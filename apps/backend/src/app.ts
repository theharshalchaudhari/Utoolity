import Fastify, { type FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import session from "@fastify/session";
import multipart from "@fastify/multipart";
import websocket from "@fastify/websocket";

import authRoutes from "./routes/auth.routes.js";
import videoToImagesRoutes from "./routes/videoToImages.routes.js";
import videoTrimRoutes from "./routes/videoTrim.routes.js";
import videoConverterRoutes from "./routes/videoConverter.routes.js";
import imageConverterRoutes from "./routes/imageConverter.routes.js";
import imageClassificationRoutes from "./routes/imageClassification.routes.js";
import polygonAnnotationRoutes from "./routes/polygonAnnotation.routes.js";
import boundingBoxRoutes from "./routes/boundingBox.routes.js";
import videoMergeRoutes from "./routes/videoMerge.routes.js";
import storageRoutes from "./routes/storage.routes.js";

import { errorMiddleware } from "./middleware/error.middleware.js";

const sessionSecret = process.env.SESSION_SECRET;
const isProduction = process.env.NODE_ENV === "production";

if (!sessionSecret || Buffer.byteLength(sessionSecret, "utf8") < 32) {
  throw new Error("SESSION_SECRET must be configured with at least 32 bytes.");
}

const app = Fastify({
  // Keep Fastify's incoming/completed record for every request out of the
  // console; errors and the server-start message remain visible.
  logger: { level: process.env.LOG_LEVEL ?? "info" },
  disableRequestLogging: true,
  bodyLimit: 50 * 1024 * 1024,
});

// Configure error handling before registering routes.
app.setErrorHandler(errorMiddleware);

// Allow requests from any frontend origin and port.
await app.register(cors, {
  origin: true,
  credentials: true,
  methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "X-Utoolity-Device-Id",
  ],
  exposedHeaders: ["Content-Disposition", "Content-Length"],
  maxAge: 86400,
});

await app.register(cookie);

await app.register(session, {
  secret: sessionSecret,
  cookieName: "sessionId",
  cookie: {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    maxAge: 8 * 60 * 60,
  },
  saveUninitialized: false,
});

await app.register(multipart, {
  limits: {
    files: 100,
    fields: 50,
    fileSize: 2 * 1024 * 1024 * 1024,
  },
});

// Register WebSocket support before registering any WebSocket routes.
await app.register(websocket);

// Device identity is only needed before a profile is authenticated (lock-screen flow).
// Once authenticated, the server session userId is authoritative; app APIs must not
// depend on a browser-cached device ID.
const lockscreenIdentityPaths = new Set([
  "/api/auth/login",
  "/api/lockscreen/unlock",
  "/api/lockscreen/me",
]);

app.addHook("preHandler", async (request, reply) => {
  if (!request.url.startsWith("/api/") || request.method === "OPTIONS") return;

  const pathname = request.url.split("?")[0] ?? request.url;
  if (pathname === "/api/auth/socket") return;
  // Issue reports are intentionally public so startup and lock-screen failures
  // can be reported before a profile is configured. The route validates and caps payloads.
  if (pathname === "/api/auth/report-issue" && request.method === "POST") return;
  if (pathname === "/api/lockscreen/register") return;

  if (lockscreenIdentityPaths.has(pathname)) {
    const deviceId = request.headers["x-utoolity-device-id"];
    if (
      typeof deviceId !== "string" ||
      !/^[a-zA-Z0-9._:-]{8,128}$/.test(deviceId)
    ) {
      return reply.code(400).send({
        message:
          "A valid X-Utoolity-Device-Id header is required for the lock screen.",
      });
    }
    return;
  }

  const session = (
    request as FastifyRequest & {
      session?: { userId?: string };
    }
  ).session;

  if (!session?.userId) {
    return reply.code(401).send({ message: "Not authenticated." });
  }
});

// Health check
app.get("/health", async () => ({
  status: "ok",
  service: "utoolity-backend",
  timestamp: new Date().toISOString(),
}));

// Authentication and storage
await app.register(authRoutes, {
  prefix: "/api",
});

await app.register(storageRoutes, {
  prefix: "/api",
});

// Video tools
await app.register(videoToImagesRoutes, {
  prefix: "/api/tools/video-to-images",
});

await app.register(videoTrimRoutes, {
  prefix: "/api/tools/video-trim",
});

await app.register(videoConverterRoutes, {
  prefix: "/api/tools/video-converter",
});

await app.register(videoMergeRoutes, {
  prefix: "/api/tools/video-merge",
});

// Image tools
await app.register(imageConverterRoutes, {
  prefix: "/api/tools/image-converter",
});

await app.register(imageClassificationRoutes, {
  prefix: "/api/tools/image-classification",
});

await app.register(polygonAnnotationRoutes, {
  prefix: "/api/tools/polygon-annotation",
});

await app.register(boundingBoxRoutes, {
  prefix: "/api/tools/bounding-box",
});

export default app;
