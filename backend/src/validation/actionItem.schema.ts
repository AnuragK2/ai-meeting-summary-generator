import { z } from "zod";
import {
  ActionItemStatusSchema,
  IsoDateLike,
  PrioritySchema,
} from "./common.schema.js";

export const UpdateActionItemInputSchema = z
  .object({
    owner: z.string().trim().min(1).max(120).optional(),
    task_description: z.string().trim().min(1).max(2000).optional(),
    due_date: z.union([IsoDateLike, z.null()]).optional(),
    priority: PrioritySchema.optional(),
    status: ActionItemStatusSchema.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "at least one field must be provided",
  });

export type UpdateActionItemInput = z.infer<typeof UpdateActionItemInputSchema>;

export const ActionItemFiltersSchema = z.object({
  owner: z.string().trim().min(1).optional(),
  status: ActionItemStatusSchema.optional(),
  priority: PrioritySchema.optional(),
  due_before: IsoDateLike.optional(),
  overdue: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((v) => v === "true"),
  meeting_id: z.string().optional(),
});

export type ActionItemFilters = z.infer<typeof ActionItemFiltersSchema>;
