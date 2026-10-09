import type { FastifyPluginAsync } from "fastify";
import * as controller from "../controllers/polygonAnnotation.controller.js";

const polygonAnnotationRoutes: FastifyPluginAsync = async (app) => {
  app.post("/", controller.save);
  app.get<{ Params: { jobId: string } }>("/status/:jobId", controller.getStatus);
};

export default polygonAnnotationRoutes;
