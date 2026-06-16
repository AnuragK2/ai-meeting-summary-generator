import type {
  ActionItemStatus,
  Priority,
} from "../validation/common.schema.js";

export interface ActionItem {
  id: string;
  meeting_id: string;
  owner: string;
  task_description: string;
  due_date: string | null;
  priority: Priority;
  status: ActionItemStatus;
  source_quote: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActionItemWithMeeting extends ActionItem {
  meeting_title: string;
  meeting_date: string;
}
