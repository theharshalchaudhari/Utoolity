import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import session from "@fastify/session";
import multipart from "@fastify/multipart";

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
  throw new Error(
    "SESSION_SECRET must be configured with at least 32 bytes.",
  );
}

const allowAllOrigins = process.env.CORS_ALLOW_ALL_ORIGINS === "true";
const allowedOrigins = new Set(
  (
    process.env.FRONTEND_URL ??
    "http://localhost:3000,http://127.0.0.1:3000"
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

const app = Fastify({
  logger: true,
  bodyLimit: 50 * 1024 * 1024,
});

app.setErrorHandler(errorMiddleware);

// Credentials require an explicit reflected origin, never Access-Control-Allow-Origin: *.
await app.register(cors, {
  credentials: true,
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowAllOrigins || allowedOrigins.has(origin)) {
      return callback(null, true);
    }
    app.log.warn({ origin }, "Blocked request by CORS policy");
    return callback(new Error("Origin is not allowed by CORS"), false);
  },
  methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
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

app.get("/health", async () => ({ status: "ok" }));

await app.register(authRoutes, { prefix: "/api" });
await app.register(storageRoutes, { prefix: "/api" });

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
