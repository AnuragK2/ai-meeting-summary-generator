import { Router, type RequestHandler } from "express";
import type { MeetingController } from "../controllers/MeetingController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

export function meetingsRouter(
  controller: MeetingController,
  /** Applied only to the two endpoints that trigger an LLM call. */
  extractionLimiter: RequestHandler = (_req, _res, next) => next(),
): Router {
  const router = Router();
  router.get("/", controller.list);
  router.post("/", extractionLimiter, asyncHandler(controller.create));
  router.get("/:id", controller.get);
  router.delete("/:id", controller.remove);
  router.post(
    "/:id/regenerate",
    extractionLimiter,
    asyncHandler(controller.regenerate),
  );
  router.get("/:id/export.md", controller.exportMarkdown);
  return router;
}
