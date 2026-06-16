import { createProductionApp } from "./app.js";
import { config } from "./config/env.js";

/**
 * Last-line-of-defence handlers. We log and keep running — restarting the
 * process on every transient promise rejection would be worse than the
 * underlying bug. A real deployment would tie these into the error
 * tracker (Sentry / Datadog / etc.).
 */
process.on("unhandledRejection", (reason) => {
  // eslint-disable-next-line no-console
  console.error("[unhandledRejection]", reason);
});
process.on("uncaughtException", (err) => {
  // eslint-disable-next-line no-console
  console.error("[uncaughtException]", err);
});

let app;
try {
  app = createProductionApp();
} catch (err) {
  // Most common failure: OPENAI_API_KEY missing. We exit non-zero so process
  // managers (pm2, docker, systemd) surface the failure to the operator.
  // eslint-disable-next-line no-console
  console.error(
    "[pitchsense] failed to start:",
    err instanceof Error ? err.message : err,
  );
  process.exit(1);
}

const server = app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(
    `[pitchsense] backend listening on http://localhost:${config.port}`,
  );
});

function shutdown(signal: string) {
  // eslint-disable-next-line no-console
  console.log(`[pitchsense] ${signal} received, shutting down gracefully…`);
  server.close((err) => {
    if (err) {
      // eslint-disable-next-line no-console
      console.error("[pitchsense] error during shutdown:", err);
      process.exit(1);
    }
    process.exit(0);
  });
  // Hard exit after 10s if the server is wedged.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
