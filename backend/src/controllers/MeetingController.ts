import type { Request, Response } from "express";
import { parseOrThrow } from "../middleware/validate.js";
import type { MarkdownService } from "../services/MarkdownService.js";
import type { MeetingService } from "../services/MeetingService.js";
import { CreateMeetingInputSchema } from "../validation/meeting.schema.js";

function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "meeting"
  );
}

export class MeetingController {
  constructor(
    private readonly meetings: MeetingService,
    private readonly markdown: MarkdownService,
  ) {}

  list = (_req: Request, res: Response): void => {
    res.json({ meetings: this.meetings.list() });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const input = parseOrThrow(CreateMeetingInputSchema, req.body);
    const { detail, extraction } = await this.meetings.create(input);
    res.status(201).json({ ...detail, extraction_ok: extraction.ok });
  };

  get = (req: Request, res: Response): void => {
    res.json(this.meetings.getDetail(req.params.id));
  };

  remove = (req: Request, res: Response): void => {
    this.meetings.delete(req.params.id);
    res.status(204).send();
  };

  regenerate = async (req: Request, res: Response): Promise<void> => {
    const { detail, extraction } = await this.meetings.regenerate(req.params.id);
    res.json({ ...detail, extraction_ok: extraction.ok });
  };

  exportMarkdown = (req: Request, res: Response): void => {
    const detail = this.meetings.getDetail(req.params.id);
    const md = this.markdown.render(detail);
    const filename = `${slugify(detail.meeting.title)}-${detail.meeting.date}.md`;
    res.setHeader("Content-Type", "text/markdown; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(md);
  };
}
