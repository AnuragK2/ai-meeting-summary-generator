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
