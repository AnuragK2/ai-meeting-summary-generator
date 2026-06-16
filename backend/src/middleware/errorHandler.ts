import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { HttpError } from "../errors/index.js";

interface BodyParserError extends Error {
  status?: number;
  statusCode?: number;
  type?: string;
  expose?: boolean;
}

/**
 * Central error middleware. Renders every error into a consistent envelope:
 *
 *   { error: { code, message, details? } }
 *
 * - `HttpError` and subclasses map straight through with their status/code.
 * - `ZodError` becomes 400 with the flattened issue map.
 * - Express body-parser errors (`entity.parse.failed`, `entity.too.large`)
 *   get specific, user-friendly translations instead of leaking raw
 *   parser internals.
 * - Anything else is logged with full detail server-side and rendered as
 *   500 with the original message (we accept this leak for a take-home;
 *   in production this would be a generic "Internal server error").
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (res.headersSent) return;

  if (err instanceof HttpError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "BAD_REQUEST",
        message: "Validation failed",
        details: err.flatten(),
      },
    });
    return;
  }

  const bp = err as BodyParserError;
  if (bp?.type === "entity.parse.failed") {
    res.status(400).json({
      error: {
        code: "INVALID_JSON",
        message: "Request body is not valid JSON.",
      },
    });
    return;
  }
  if (bp?.type === "entity.too.large") {
    res.status(413).json({
      error: {
        code: "PAYLOAD_TOO_LARGE",
        message:
          "Request body exceeds the 2 MB limit. Try a shorter transcript.",
      },
    });
    return;
  }

  const status =
    typeof bp?.status === "number"
      ? bp.status
      : typeof bp?.statusCode === "number"
        ? bp.statusCode
        : 500;
  const message =
    typeof bp?.message === "string" && bp.message
      ? bp.message
      : "Internal server error";
  const code = (err as { code?: string })?.code ?? "INTERNAL_ERROR";

  if (status >= 500) {
    // eslint-disable-next-line no-console
    console.error("[error]", {
      code,
      status,
      message,
      stack: err instanceof Error ? err.stack : undefined,
    });
  }

  res.status(status).json({ error: { code, message } });
};
