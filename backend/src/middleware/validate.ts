import type { z, ZodTypeAny } from "zod";
import { BadRequestError } from "../errors/index.js";

/**
 * Parse a Zod schema or throw `BadRequestError` with the flattened Zod
 * issue map as `details`. Used by controllers to validate request bodies
 * and query strings.
 */
export function parseOrThrow<S extends ZodTypeAny>(
  schema: S,
  value: unknown,
): z.output<S> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new BadRequestError("Validation failed", result.error.flatten());
  }
  return result.data;
}
