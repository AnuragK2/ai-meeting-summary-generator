import { Router } from "express";
import type { ActionItemController } from "../controllers/ActionItemController.js";

export function actionItemsRouter(controller: ActionItemController): Router {
  const router = Router();
  router.get("/", controller.list);
  router.patch("/:id", controller.update);
  return router;
}
