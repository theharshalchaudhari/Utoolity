import type { FastifyPluginAsync } from "fastify";
import * as controller from "../controllers/boundingBox.controller.js";

const boundingBoxRoutes: FastifyPluginAsync = async (app) => {
  app.post("/", controller.save);
  app.get<{ Params: { jobId: string } }>("/status/:jobId", controller.getStatus);
};

export default boundingBoxRoutes;
