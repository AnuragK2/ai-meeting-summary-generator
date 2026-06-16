import { z } from "zod";
import { IsoDateLike } from "./common.schema.js";

export const CreateMeetingInputSchema = z.object({
  title: z.string().trim().min(1, "title is required").max(200),
  date: IsoDateLike,
  participants: z.array(z.string().trim().min(1)).max(100).default([]),
  raw_transcript: z
    .string()
    .trim()
    .min(50, "transcript must be at least 50 characters"),
});

export type CreateMeetingInput = z.infer<typeof CreateMeetingInputSchema>;
