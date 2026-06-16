import type { ActionItem } from "./actionItem.model.js";
import type { Meeting } from "./meeting.model.js";
import type { MeetingSummary } from "./summary.model.js";

export interface MeetingDetail {
  meeting: Meeting;
  summary: MeetingSummary | null;
  action_items: ActionItem[];
}
