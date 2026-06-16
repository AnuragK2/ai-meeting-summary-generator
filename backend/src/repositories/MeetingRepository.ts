import { v4 as uuid } from "uuid";
import type { AppDatabase } from "../infrastructure/database/connection.js";
import type {
  Meeting,
  MeetingListRow,
} from "../models/meeting.model.js";
import type { ExtractionStatus } from "../validation/common.schema.js";

interface MeetingRow {
  id: string;
  title: string;
  date: string;
  participants: string;
  raw_transcript: string;
  extraction_status: string;
  extraction_error: string | null;
  created_at: string;
  updated_at: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function rowToMeeting(row: MeetingRow): Meeting {
  return {
    id: row.id,
    title: row.title,
    date: row.date,
    participants: JSON.parse(row.participants) as string[],
    raw_transcript: row.raw_transcript,
    extraction_status: row.extraction_status as ExtractionStatus,
    extraction_error: row.extraction_error,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export class MeetingRepository {
  constructor(private readonly db: AppDatabase) {}

  create(input: {
    title: string;
    date: string;
    participants: string[];
    raw_transcript: string;
  }): Meeting {
    const id = uuid();
    const ts = nowIso();
    this.db
      .prepare(
        `INSERT INTO meetings
          (id, title, date, participants, raw_transcript,
           extraction_status, extraction_error, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'pending', NULL, ?, ?)`,
      )
      .run(
        id,
        input.title,
        input.date,
        JSON.stringify(input.participants),
        input.raw_transcript,
        ts,
        ts,
      );
    return this.findById(id)!;
  }

  findById(id: string): Meeting | null {
    const row = this.db
      .prepare(`SELECT * FROM meetings WHERE id = ?`)
      .get(id) as MeetingRow | undefined;
    return row ? rowToMeeting(row) : null;
  }

  list(): MeetingListRow[] {
    const rows = this.db
      .prepare(
        `SELECT m.id, m.title, m.date, m.participants,
                m.extraction_status, m.extraction_error,
                m.created_at, m.updated_at,
                COALESCE(c.cnt, 0) AS action_item_count
         FROM meetings m
         LEFT JOIN (
           SELECT meeting_id, COUNT(*) AS cnt
           FROM action_items
           GROUP BY meeting_id
         ) c ON c.meeting_id = m.id
         ORDER BY datetime(m.date) DESC, m.created_at DESC`,
      )
      .all() as (MeetingRow & { action_item_count: number })[];
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      date: r.date,
      participants: JSON.parse(r.participants) as string[],
      extraction_status: r.extraction_status as ExtractionStatus,
      extraction_error: r.extraction_error,
      created_at: r.created_at,
      updated_at: r.updated_at,
      action_item_count: Number(r.action_item_count),
    }));
  }

  delete(id: string): boolean {
    const info = this.db.prepare(`DELETE FROM meetings WHERE id = ?`).run(id);
    return info.changes > 0;
  }

  updateExtractionStatus(
    id: string,
    status: ExtractionStatus,
    error: string | null = null,
  ): void {
    this.db
      .prepare(
        `UPDATE meetings
         SET extraction_status = ?, extraction_error = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(status, error, nowIso(), id);
  }

  /**
   * Mark a meeting as `completed` and clear any stored error. Intended to be
   * called from inside a transaction together with summary + action item
   * writes so the change is atomic.
   */
  markCompleted(id: string): void {
    this.db
      .prepare(
        `UPDATE meetings
         SET extraction_status = 'completed',
             extraction_error = NULL,
             updated_at = ?
         WHERE id = ?`,
      )
      .run(nowIso(), id);
  }
}
