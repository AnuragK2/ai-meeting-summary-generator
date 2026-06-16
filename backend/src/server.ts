import type { Server } from "node:http";
import { createProductionApp } from "./app.js";
import { config } from "./config/env.js";

// Declared up here so the process-level handlers can reference it even
// if a crash happens during startup (in which case it's still undefined
// and the handlers just skip the graceful-close step).
let server: Server | undefined;

/**
 * Last-line-of-defence handlers.
 *
 * `unhandledRejection` is logged but does NOT crash: a transient promise
 * rejection (e.g. one failed background HTTP) is rarely worth bouncing
 * the whole process for.
 *
 * `uncaughtException` IS fatal — the process is in an undefined state
 * by definition, and a process manager (pm2 / docker / systemd) will
 * restart us into a known-good state. We attempt a one-shot graceful
 * shutdown first so in-flight responses can drain, then exit non-zero.
 *
 * A real deployment would tie both into the error tracker
 * (Sentry / Datadog / etc.).
 */
process.on("unhandledRejection", (reason) => {
  // eslint-disable-next-line no-console
  console.error("[unhandledRejection]", reason);
});
process.on("uncaughtException", (err) => {
  // eslint-disable-next-line no-console
  console.error("[uncaughtException] fatal, exiting:", err);
  // Force-exit shortly after to ensure we don't hang forever if shutdown wedges.
  setTimeout(() => process.exit(1), 1_000).unref();
  try {
    if (server) server.close(() => process.exit(1));
    else process.exit(1);
  } catch {
    process.exit(1);
  }
});

let app;
try {
  app = createProductionApp();
} catch (err) {
  // Most common failure: OPENAI_API_KEY missing. We exit non-zero so process
  // managers (pm2, docker, systemd) surface the failure to the operator.
  // eslint-disable-next-line no-console
  console.error(
    "[meet.ai] failed to start:",
    err instanceof Error ? err.message : err,
  );
  process.exit(1);
}

server = app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(
    `[meet.ai] backend listening on http://localhost:${config.port}`,
  );
});

function shutdown(signal: string) {
  // eslint-disable-next-line no-console
  console.log(`[meet.ai] ${signal} received, shutting down gracefully…`);
  server?.close((err) => {
    if (err) {
      // eslint-disable-next-line no-console
      console.error("[meet.ai] error during shutdown:", err);
      process.exit(1);
    }
    process.exit(0);
  });
  // Hard exit after 10s if the server is wedged.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
