import type { FastifyPluginAsync } from "fastify";
import * as controller from "../controllers/imageClassification.controller.js";

const imageClassificationRoutes: FastifyPluginAsync = async (app) => {
  app.post("/", controller.classify);
  app.get<{ Params: { jobId: string } }>("/status/:jobId", controller.getStatus);
};

export default imageClassificationRoutes;
