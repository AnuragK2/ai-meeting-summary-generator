import { z } from "zod";
import { PrioritySchema } from "./common.schema.js";

/**
 * The contract enforced both on the OpenAI response (after JSON parsing) and
 * on the JSON Schema we send to OpenAI's strict structured output mode.
 *
 * OpenAI strict json_schema requires every property to be in `required` and
 * every object to declare `additionalProperties: false`. The schema produced
 * from this Zod object is normalised in
 * `infrastructure/openai/jsonSchema.ts` before being sent to OpenAI.
 *
 * Nullable fields are modelled as `z.union([..., z.null()])` (not
 * `.optional()` and not `.nullable()`) so that the generated JSON Schema
 * has an explicit `null` arm rather than dropping the field entirely.
 */
export const ExtractedDecisionSchema = z.object({
  text: z.string().min(1),
  source_quote: z.union([z.string(), z.null()]),
});

export const ExtractedActionItemSchema = z.object({
  owner: z.string().min(1),
  task_description: z.string().min(1),
  due_date: z.union([z.string(), z.null()]),
  priority: PrioritySchema,
  source_quote: z.union([z.string(), z.null()]),
});

export const ExtractionResultSchema = z.object({
  summary: z.string().min(1),
  key_decisions: z.array(ExtractedDecisionSchema),
  open_questions: z.array(z.string().min(1)),
  action_items: z.array(ExtractedActionItemSchema),
});

export type ExtractionResult = z.infer<typeof ExtractionResultSchema>;
export type ExtractedActionItem = z.infer<typeof ExtractedActionItemSchema>;
export type ExtractedDecision = z.infer<typeof ExtractedDecisionSchema>;
