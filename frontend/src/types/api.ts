export type Priority = "low" | "medium" | "high";
export type ActionItemStatus = "open" | "in_progress" | "done";
export type ExtractionStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

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

export interface KeyDecision {
  text: string;
  source_quote: string | null;
}

export interface MeetingSummary {
  meeting_id: string;
  summary: string;
  key_decisions: KeyDecision[];
  open_questions: string[];
  generated_at: string;
}

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

export interface MeetingDetail {
  meeting: Meeting;
  summary: MeetingSummary | null;
  action_items: ActionItem[];
  extraction_ok?: boolean;
}

export interface CreateMeetingInput {
  title: string;
  date: string;
  participants: string[];
  raw_transcript: string;
}

export interface UpdateActionItemInput {
  owner?: string;
  task_description?: string;
  due_date?: string | null;
  priority?: Priority;
  status?: ActionItemStatus;
}

export interface ActionItemFilters {
  owner?: string;
  status?: ActionItemStatus;
  priority?: Priority;
  due_before?: string;
  overdue?: boolean;
  meeting_id?: string;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
