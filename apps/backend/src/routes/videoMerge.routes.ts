import type { FastifyPluginAsync } from "fastify";
import * as controller from "../controllers/videoMerge.controller.js";

const videoMergeRoutes: FastifyPluginAsync = async (app) => {
  app.post("/", controller.merge);
  app.get<{ Params: { jobId: string } }>("/status/:jobId", controller.getStatus);
};

export default videoMergeRoutes;
