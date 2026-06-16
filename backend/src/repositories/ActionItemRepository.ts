import { v4 as uuid } from "uuid";
import type { AppDatabase } from "../infrastructure/database/connection.js";
import type {
  ActionItem,
  ActionItemWithMeeting,
} from "../models/actionItem.model.js";
import type {
  ActionItemFilters,
  UpdateActionItemInput,
} from "../validation/actionItem.schema.js";
import type {
  ActionItemStatus,
  Priority,
} from "../validation/common.schema.js";

interface ActionItemRow {
  id: string;
  meeting_id: string;
  owner: string;
  task_description: string;
  due_date: string | null;
  priority: string;
  status: string;
  source_quote: string | null;
  created_at: string;
  updated_at: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function rowToActionItem(row: ActionItemRow): ActionItem {
  return {
    id: row.id,
    meeting_id: row.meeting_id,
    owner: row.owner,
    task_description: row.task_description,
    due_date: row.due_date,
    priority: row.priority as Priority,
    status: row.status as ActionItemStatus,
    source_quote: row.source_quote,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export class ActionItemRepository {
  constructor(private readonly db: AppDatabase) {}

  listForMeeting(meetingId: string): ActionItem[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM action_items
         WHERE meeting_id = ?
         ORDER BY
           CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
           CASE status WHEN 'open' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END,
           datetime(COALESCE(due_date, '9999-12-31'))`,
      )
      .all(meetingId) as ActionItemRow[];
    return rows.map(rowToActionItem);
  }

  findById(id: string): ActionItem | null {
    const row = this.db
      .prepare(`SELECT * FROM action_items WHERE id = ?`)
      .get(id) as ActionItemRow | undefined;
    return row ? rowToActionItem(row) : null;
  }

  /**
   * Delete every action item for a meeting. Used during extraction
   * regeneration; called inside a transaction with the matching summary
   * upsert and re-insert.
   */
  deleteForMeeting(meetingId: string): void {
    this.db
      .prepare(`DELETE FROM action_items WHERE meeting_id = ?`)
      .run(meetingId);
  }

  insert(input: {
    meeting_id: string;
    owner: string;
    task_description: string;
    due_date: string | null;
    priority: Priority;
    source_quote: string | null;
  }): ActionItem {
    const id = uuid();
    const ts = nowIso();
    this.db
      .prepare(
        `INSERT INTO action_items
          (id, meeting_id, owner, task_description, due_date,
           priority, status, source_quote, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'open', ?, ?, ?)`,
      )
      .run(
        id,
        input.meeting_id,
        input.owner,
        input.task_description,
        input.due_date,
        input.priority,
        input.source_quote,
        ts,
        ts,
      );
    return this.findById(id)!;
  }

  update(id: string, patch: UpdateActionItemInput): ActionItem | null {
    const existing = this.findById(id);
    if (!existing) return null;

    const next: ActionItem = {
      ...existing,
      owner: patch.owner ?? existing.owner,
      task_description: patch.task_description ?? existing.task_description,
      due_date:
        patch.due_date === undefined ? existing.due_date : patch.due_date,
      priority: patch.priority ?? existing.priority,
      status: patch.status ?? existing.status,
      updated_at: nowIso(),
    };

    this.db
      .prepare(
        `UPDATE action_items
         SET owner = ?, task_description = ?, due_date = ?,
             priority = ?, status = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(
        next.owner,
        next.task_description,
        next.due_date,
        next.priority,
        next.status,
        next.updated_at,
        id,
      );
    return next;
  }

  search(filters: ActionItemFilters): ActionItemWithMeeting[] {
    const where: string[] = [];
    const params: unknown[] = [];

    if (filters.owner) {
      where.push("LOWER(ai.owner) LIKE LOWER(?)");
      params.push(`%${filters.owner}%`);
    }
    if (filters.status) {
      where.push("ai.status = ?");
      params.push(filters.status);
    }
    if (filters.priority) {
      where.push("ai.priority = ?");
      params.push(filters.priority);
    }
    if (filters.meeting_id) {
      where.push("ai.meeting_id = ?");
      params.push(filters.meeting_id);
    }
    if (filters.due_before) {
      where.push("ai.due_date IS NOT NULL AND date(ai.due_date) < date(?)");
      params.push(filters.due_before);
    }
    if (filters.overdue) {
      where.push(
        "ai.due_date IS NOT NULL AND date(ai.due_date) < date('now') AND ai.status != 'done'",
      );
    }

    const sql = `
      SELECT ai.*, m.title AS meeting_title, m.date AS meeting_date
      FROM action_items ai
      JOIN meetings m ON m.id = ai.meeting_id
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY
        CASE WHEN ai.status = 'done' THEN 1 ELSE 0 END,
        datetime(COALESCE(ai.due_date, '9999-12-31')),
        CASE ai.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END
    `;
    const rows = this.db.prepare(sql).all(...params) as (ActionItemRow & {
      meeting_title: string;
      meeting_date: string;
    })[];

    return rows.map((r) => ({
      ...rowToActionItem(r),
      meeting_title: r.meeting_title,
      meeting_date: r.meeting_date,
    }));
  }
}
