import type { RequestHandler } from "express";
import { NotFoundError } from "../errors/index.js";

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(new NotFoundError("Unknown API route"));
};
