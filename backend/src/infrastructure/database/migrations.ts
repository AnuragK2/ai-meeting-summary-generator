/**
 * Bootstrap migrations. Run unconditionally on every connection open via
 * `CREATE TABLE IF NOT EXISTS`. For a production system this would be
 * replaced by a real migration runner (e.g. node-pg-migrate / Prisma /
 * Knex) with versioned files; for this take-home idempotent DDL is enough.
 */
export const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS meetings (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  participants TEXT NOT NULL DEFAULT '[]',
  raw_transcript TEXT NOT NULL,
  extraction_status TEXT NOT NULL DEFAULT 'pending',
  extraction_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS meeting_summaries (
  meeting_id TEXT PRIMARY KEY,
  summary TEXT NOT NULL,
  key_decisions TEXT NOT NULL DEFAULT '[]',
  open_questions TEXT NOT NULL DEFAULT '[]',
  generated_at TEXT NOT NULL,
  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS action_items (
  id TEXT PRIMARY KEY,
  meeting_id TEXT NOT NULL,
  owner TEXT NOT NULL DEFAULT 'Unassigned',
  task_description TEXT NOT NULL,
  due_date TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  source_quote TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_action_items_meeting ON action_items(meeting_id);
CREATE INDEX IF NOT EXISTS idx_action_items_status ON action_items(status);
CREATE INDEX IF NOT EXISTS idx_action_items_due ON action_items(due_date);
`;
