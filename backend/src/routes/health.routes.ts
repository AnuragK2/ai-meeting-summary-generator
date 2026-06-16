import { Router } from "express";
import type { HealthController } from "../controllers/HealthController.js";

export function healthRouter(controller: HealthController): Router {
  const router = Router();
  router.get("/", controller.ping);
  return router;
}
