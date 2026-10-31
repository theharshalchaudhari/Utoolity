export const config = {
  port: Number(process.env.BACKEND_PORT) || 4000,
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  uploadDir: process.env.UPLOAD_DIR || "./uploads",
  outputDir: process.env.OUTPUT_DIR || "./outputs",
};
