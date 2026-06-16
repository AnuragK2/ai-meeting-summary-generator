import { LlmError } from "../errors/index.js";
import type { AppDatabase } from "../infrastructure/database/connection.js";
import type { ActionItemRepository } from "../repositories/ActionItemRepository.js";
import type { MeetingRepository } from "../repositories/MeetingRepository.js";
import type { SummaryRepository } from "../repositories/SummaryRepository.js";
import type { ExtractionResult } from "../validation/extraction.schema.js";
import type { MeetingExtractor } from "./MeetingExtractor.js";

export type ExtractionOutcome = { ok: true } | { ok: false; error: string };

/**
 * Orchestrates the AI extraction pipeline for a single meeting:
 *
 *   1. mark `processing` (visible to the UI through the meetings list)
 *   2. call the LLM (any `MeetingExtractor` strategy)
 *   3. atomically upsert the summary, replace the action items, and mark the
 *      meeting `completed`
 *   4. on any failure, persist `failed` + the error message so the UI can
 *      offer a Regenerate retry
 */
export class ExtractionService {
  constructor(
    private readonly db: AppDatabase,
    private readonly extractor: MeetingExtractor,
    private readonly meetings: MeetingRepository,
    private readonly summaries: SummaryRepository,
    private readonly actionItems: ActionItemRepository,
  ) {}

  async run(meetingId: string, transcript: string): Promise<ExtractionOutcome> {
    this.meetings.updateExtractionStatus(meetingId, "processing");
    try {
      const result = await this.extractor.extract(transcript);
      this.persist(meetingId, result);
      return { ok: true };
    } catch (err) {
      const message = this.toMessage(err);
      this.meetings.updateExtractionStatus(meetingId, "failed", message);
      return { ok: false, error: message };
    }
  }

  private persist(meetingId: string, extraction: ExtractionResult): void {
    const ts = new Date().toISOString();
    const tx = this.db.transaction(() => {
      this.summaries.upsert({
        meeting_id: meetingId,
        summary: extraction.summary,
        key_decisions: extraction.key_decisions,
        open_questions: extraction.open_questions,
        generated_at: ts,
      });

      this.actionItems.deleteForMeeting(meetingId);
      for (const item of extraction.action_items) {
        this.actionItems.insert({
          meeting_id: meetingId,
          owner: item.owner || "Unassigned",
          task_description: item.task_description,
          due_date: item.due_date,
          priority: item.priority,
          source_quote: item.source_quote,
        });
      }

      this.meetings.markCompleted(meetingId);
    });
    tx();
  }

  private toMessage(err: unknown): string {
    if (err instanceof LlmError) return err.message;
    if (err instanceof Error) return err.message;
    return "Unknown extraction error";
  }
}
