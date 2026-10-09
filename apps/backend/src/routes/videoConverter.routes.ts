import type { FastifyPluginAsync } from "fastify";
import * as controller from "../controllers/videoConverter.controller.js";

const videoConverterRoutes: FastifyPluginAsync = async (app) => {
  app.post("/", controller.convert);
  app.get<{ Params: { jobId: string } }>("/status/:jobId", controller.getStatus);
};

export default videoConverterRoutes;
