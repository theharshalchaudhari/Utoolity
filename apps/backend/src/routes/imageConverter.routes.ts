import type { FastifyPluginAsync } from "fastify";
import * as controller from "../controllers/imageConverter.controller.js";

const imageConverterRoutes: FastifyPluginAsync = async (app) => {
  app.post("/", controller.convert);
  app.get<{ Params: { jobId: string } }>("/status/:jobId", controller.getStatus);
};

export default imageConverterRoutes;
