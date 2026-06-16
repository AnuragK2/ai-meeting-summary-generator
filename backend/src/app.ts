import cors from "cors";
import express, { type Express } from "express";
import { config, assertOpenAiConfigured } from "./config/env.js";
import { ActionItemController } from "./controllers/ActionItemController.js";
import { HealthController } from "./controllers/HealthController.js";
import { MeetingController } from "./controllers/MeetingController.js";
import {
  createDatabase,
  type AppDatabase,
} from "./infrastructure/database/connection.js";
import { OpenAiExtractor } from "./infrastructure/openai/OpenAiExtractor.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFoundHandler } from "./middleware/notFound.js";
import { ActionItemRepository } from "./repositories/ActionItemRepository.js";
import { MeetingRepository } from "./repositories/MeetingRepository.js";
import { SummaryRepository } from "./repositories/SummaryRepository.js";
import { actionItemsRouter } from "./routes/actionItem.routes.js";
import { healthRouter } from "./routes/health.routes.js";
import { meetingsRouter } from "./routes/meeting.routes.js";
import { ActionItemService } from "./services/ActionItemService.js";
import { ExtractionService } from "./services/ExtractionService.js";
import { MarkdownService } from "./services/MarkdownService.js";
import { MeetingService } from "./services/MeetingService.js";
import type { MeetingExtractor } from "./services/MeetingExtractor.js";

export interface AppDependencies {
  db: AppDatabase;
  extractor: MeetingExtractor;
}

/**
 * Composition root. Wires every layer (repositories -> services ->
 * controllers -> routes) and returns the Express app. Tests build their
 * own dependencies and call this with a `:memory:` DB + stub extractor.
 */
export function createApp(deps: AppDependencies): Express {
  const meetingsRepo = new MeetingRepository(deps.db);
  const summariesRepo = new SummaryRepository(deps.db);
  const actionItemsRepo = new ActionItemRepository(deps.db);

  const extractionService = new ExtractionService(
    deps.db,
    deps.extractor,
    meetingsRepo,
    summariesRepo,
    actionItemsRepo,
  );
  const markdownService = new MarkdownService();
  const meetingService = new MeetingService(
    meetingsRepo,
    summariesRepo,
    actionItemsRepo,
    extractionService,
  );
  const actionItemService = new ActionItemService(actionItemsRepo);

  const healthController = new HealthController();
  const meetingController = new MeetingController(meetingService, markdownService);
  const actionItemController = new ActionItemController(actionItemService);

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "2mb" }));

  app.use("/api/health", healthRouter(healthController));
  app.use("/api/meetings", meetingsRouter(meetingController));
  app.use("/api/action-items", actionItemsRouter(actionItemController));

  app.use("/api", notFoundHandler);
  app.use(errorHandler);

  return app;
}

/**
 * Build the production app: real SQLite file + real OpenAI extractor.
 * Throws if `OPENAI_API_KEY` is missing because the extractor will fail
 * on its first request anyway.
 */
export function createProductionApp(): Express {
  assertOpenAiConfigured();
  const db = createDatabase();
  const extractor = new OpenAiExtractor({
    apiKey: config.openai.apiKey,
    model: config.openai.model,
  });
  return createApp({ db, extractor });
}
