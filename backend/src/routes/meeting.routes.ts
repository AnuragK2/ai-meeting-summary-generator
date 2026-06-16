import { Router } from "express";
import type { MeetingController } from "../controllers/MeetingController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

export function meetingsRouter(controller: MeetingController): Router {
  const router = Router();
  router.get("/", controller.list);
  router.post("/", asyncHandler(controller.create));
  router.get("/:id", controller.get);
  router.delete("/:id", controller.remove);
  router.post("/:id/regenerate", asyncHandler(controller.regenerate));
  router.get("/:id/export.md", controller.exportMarkdown);
  return router;
}
