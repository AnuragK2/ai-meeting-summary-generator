import cors from "cors";
import express, { type Express, type RequestHandler } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
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
  /**
   * Disable rate limiting (tests). The limiter holds in-memory counters
   * that persist across requests in the same process, which breaks
   * supertest suites that send many requests quickly.
   */
  disableRateLimit?: boolean;
}

/**
 * CORS handler that honours an env-driven allow-list. `"*"` disables
 * origin checking entirely; otherwise only listed origins are allowed.
 */
function buildCors(): RequestHandler {
  const list = config.allowedOrigins;
  if (list.includes("*")) return cors();
  return cors({
    origin(origin, cb) {
      // Allow non-browser requests (curl, supertest) which omit Origin.
      if (!origin) return cb(null, true);
      cb(null, list.includes(origin));
    },
  });
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
  // helmet hardens common headers (X-Content-Type-Options, CSP, etc.). We
  // disable the strict CSP because this server only emits JSON / markdown.
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(buildCors());
  app.use(express.json({ limit: config.bodyLimit }));

  // Per-IP rate limit on the two endpoints that hit the LLM. Skipped in
  // tests so supertest suites do not exhaust the bucket.
  const extractionLimiter: RequestHandler = deps.disableRateLimit
    ? (_req, _res, next) => next()
    : rateLimit({
        windowMs: 60_000,
        limit: config.extractionRateLimitPerMin,
        standardHeaders: "draft-7",
        legacyHeaders: false,
        handler: (_req, res) => {
          res.status(429).json({
            error: {
              code: "RATE_LIMITED",
              message: `Too many extraction requests. Please wait a minute and try again. Limit: ${config.extractionRateLimitPerMin}/min.`,
            },
          });
        },
      });

  app.use("/api/health", healthRouter(healthController));
  app.use("/api/meetings", meetingsRouter(meetingController, extractionLimiter));
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
    requestTimeoutMs: config.openai.requestTimeoutMs,
  });
  return createApp({ db, extractor });
}
