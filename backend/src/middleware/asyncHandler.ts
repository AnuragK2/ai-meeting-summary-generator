import type { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Wrap an async route handler so a rejected promise routes to the central
 * error middleware instead of crashing the request.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
