import type { FastifyPluginAsync } from "fastify";
import * as controller from "../controllers/videoTrim.controller.js";

const videoTrimRoutes: FastifyPluginAsync = async (app) => {
  app.post("/", controller.trim);
  app.get<{ Params: { jobId: string } }>("/status/:jobId", controller.getStatus);
};

export default videoTrimRoutes;
