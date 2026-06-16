import { z } from "zod";

export const PrioritySchema = z.enum(["low", "medium", "high"]);
export const ActionItemStatusSchema = z.enum(["open", "in_progress", "done"]);
export const ExtractionStatusSchema = z.enum([
  "pending",
  "processing",
  "completed",
  "failed",
]);

export type Priority = z.infer<typeof PrioritySchema>;
export type ActionItemStatus = z.infer<typeof ActionItemStatusSchema>;
export type ExtractionStatus = z.infer<typeof ExtractionStatusSchema>;

/**
 * Accepts a YYYY-MM-DD date or a full ISO datetime. Downstream code may
 * normalise (e.g. take only the date portion) when persisting.
 */
export const IsoDateLike = z
  .string()
  .min(1)
  .refine(
    (s) => !Number.isNaN(Date.parse(s)),
    "must be an ISO date or datetime",
  );
