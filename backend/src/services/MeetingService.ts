import { NotFoundError } from "../errors/index.js";
import type { MeetingDetail } from "../models/index.js";
import type { ActionItemRepository } from "../repositories/ActionItemRepository.js";
import type { MeetingRepository } from "../repositories/MeetingRepository.js";
import type { SummaryRepository } from "../repositories/SummaryRepository.js";
import type { CreateMeetingInput } from "../validation/meeting.schema.js";
import type {
  ExtractionOutcome,
  ExtractionService,
} from "./ExtractionService.js";

export interface MeetingCreationResult {
  detail: MeetingDetail;
  extraction: ExtractionOutcome;
}

/**
 * Application service for the Meeting aggregate. Coordinates repositories
 * and the extraction pipeline; throws `NotFoundError` for missing meetings
 * so controllers can stay thin.
 */
export class MeetingService {
  constructor(
    private readonly meetings: MeetingRepository,
    private readonly summaries: SummaryRepository,
    private readonly actionItems: ActionItemRepository,
    private readonly extraction: ExtractionService,
  ) {}

  list() {
    return this.meetings.list();
  }

  getDetail(id: string): MeetingDetail {
    const meeting = this.meetings.findById(id);
    if (!meeting) throw new NotFoundError("Meeting not found");
    return {
      meeting,
      summary: this.summaries.findByMeetingId(id),
      action_items: this.actionItems.listForMeeting(id),
    };
  }

  async create(input: CreateMeetingInput): Promise<MeetingCreationResult> {
    const meeting = this.meetings.create({
      title: input.title,
      date: input.date,
      participants: input.participants,
      raw_transcript: input.raw_transcript,
    });
    const extraction = await this.extraction.run(meeting.id, input.raw_transcript);
    return { detail: this.getDetail(meeting.id), extraction };
  }

  async regenerate(id: string): Promise<MeetingCreationResult> {
    const meeting = this.meetings.findById(id);
    if (!meeting) throw new NotFoundError("Meeting not found");
    const extraction = await this.extraction.run(id, meeting.raw_transcript);
    return { detail: this.getDetail(id), extraction };
  }

  delete(id: string): void {
    const removed = this.meetings.delete(id);
    if (!removed) throw new NotFoundError("Meeting not found");
  }
}
