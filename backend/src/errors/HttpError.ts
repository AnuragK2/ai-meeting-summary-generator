/**
 * Base class for any application-level error that should be surfaced to the
 * HTTP client with a specific status code. The central error middleware
 * (`middleware/errorHandler.ts`) inspects instances of this class and uses
 * `status`, `code`, and `details` to render the response envelope.
 */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code: string = "ERROR",
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export class BadRequestError extends HttpError {
  constructor(message = "Bad request", details?: unknown) {
    super(400, message, "BAD_REQUEST", details);
    this.name = "BadRequestError";
  }
}

export class NotFoundError extends HttpError {
  constructor(message = "Not found") {
    super(404, message, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export class ConfigurationError extends HttpError {
  constructor(message: string) {
    super(500, message, "CONFIGURATION_ERROR");
    this.name = "ConfigurationError";
  }
}
