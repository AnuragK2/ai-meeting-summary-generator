import type { ExtractionStatus } from "../validation/common.schema.js";

export interface Meeting {
  id: string;
  title: string;
  date: string;
  participants: string[];
  raw_transcript: string;
  extraction_status: ExtractionStatus;
  extraction_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface MeetingListRow extends Omit<Meeting, "raw_transcript"> {
  action_item_count: number;
}
