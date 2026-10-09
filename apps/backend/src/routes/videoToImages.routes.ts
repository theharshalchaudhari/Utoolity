
import type { FastifyPluginAsync } from "fastify";
import * as controller from "../controllers/videoToImages.controller.js";

const videoToImagesRoutes: FastifyPluginAsync = async (app) => {
  app.post("/", controller.extract);
  app.get<{ Params: { jobId: string } }>(
    "/status/:jobId",
    controller.getStatus,
  );
};

export default videoToImagesRoutes;
