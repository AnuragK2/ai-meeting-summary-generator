import { zodToJsonSchema } from "zod-to-json-schema";
import { ExtractionResultSchema } from "../../validation/extraction.schema.js";

/**
 * Build the JSON Schema sent to OpenAI's strict structured-output mode.
 *
 * OpenAI's `response_format: { type: "json_schema", strict: true }` has three
 * stricter requirements than vanilla JSON Schema:
 *   1. every object must declare `additionalProperties: false`;
 *   2. every property must be listed in `required`;
 *   3. nullable fields are expected as `type: ["T", "null"]` (the
 *      `anyOf: [{type: T}, {type: "null"}]` form is also accepted but the
 *      collapsed form is friendlier to the model).
 *
 * We derive the raw schema from the same Zod definition we validate the
 * response against, then walk the tree to enforce 1-3.
 */
export function buildExtractionJsonSchema(): Record<string, unknown> {
  const raw = zodToJsonSchema(ExtractionResultSchema, {
    $refStrategy: "none",
  }) as Record<string, unknown>;
  delete (raw as { $schema?: unknown }).$schema;
  normalise(raw);
  return raw;
}

function normalise(node: unknown): void {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) normalise(item);
    return;
  }
  const obj = node as Record<string, unknown>;

  if (Array.isArray(obj.anyOf) && obj.anyOf.length === 2) {
    const [a, b] = obj.anyOf as Record<string, unknown>[];
    const aType = typeof a?.type === "string" ? (a.type as string) : null;
    const bType = typeof b?.type === "string" ? (b.type as string) : null;
    if (aType && bType === "null") {
      obj.type = [aType, "null"];
      delete obj.anyOf;
    } else if (bType && aType === "null") {
      obj.type = [bType, "null"];
      delete obj.anyOf;
    }
  }

  if (
    obj.type === "object" &&
    obj.properties &&
    typeof obj.properties === "object"
  ) {
    obj.additionalProperties = false;
    obj.required = Object.keys(obj.properties as Record<string, unknown>);
  }
  for (const value of Object.values(obj)) {
    normalise(value);
  }
}
