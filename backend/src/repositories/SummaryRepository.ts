import type { AppDatabase } from "../infrastructure/database/connection.js";
import type {
  KeyDecision,
  MeetingSummary,
} from "../models/summary.model.js";

interface SummaryRow {
  meeting_id: string;
  summary: string;
  key_decisions: string;
  open_questions: string;
  generated_at: string;
}

export class SummaryRepository {
  constructor(private readonly db: AppDatabase) {}

  findByMeetingId(meetingId: string): MeetingSummary | null {
    const row = this.db
      .prepare(`SELECT * FROM meeting_summaries WHERE meeting_id = ?`)
      .get(meetingId) as SummaryRow | undefined;
    if (!row) return null;
    return {
      meeting_id: row.meeting_id,
      summary: row.summary,
      key_decisions: JSON.parse(row.key_decisions) as KeyDecision[],
      open_questions: JSON.parse(row.open_questions) as string[],
      generated_at: row.generated_at,
    };
  }

  upsert(input: {
    meeting_id: string;
    summary: string;
    key_decisions: KeyDecision[];
    open_questions: string[];
    generated_at: string;
  }): void {
    this.db
      .prepare(
        `INSERT INTO meeting_summaries
          (meeting_id, summary, key_decisions, open_questions, generated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(meeting_id) DO UPDATE SET
           summary = excluded.summary,
           key_decisions = excluded.key_decisions,
           open_questions = excluded.open_questions,
           generated_at = excluded.generated_at`,
      )
      .run(
        input.meeting_id,
        input.summary,
        JSON.stringify(input.key_decisions),
        JSON.stringify(input.open_questions),
        input.generated_at,
      );
  }
}
