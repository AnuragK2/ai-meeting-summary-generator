import { describe, expect, it } from "vitest";
import { MarkdownService } from "../src/services/MarkdownService.js";
import type { MeetingDetail } from "../src/models/index.js";

const renderer = new MarkdownService();

function detail(overrides: Partial<MeetingDetail> = {}): MeetingDetail {
  return {
    meeting: {
      id: "m1",
      title: "Sprint planning",
      date: "2025-11-01",
      participants: ["Alice", "Bob"],
      raw_transcript: "irrelevant",
      extraction_status: "completed",
      extraction_error: null,
      created_at: "2025-11-01T00:00:00.000Z",
      updated_at: "2025-11-01T00:00:00.000Z",
    },
    summary: {
      meeting_id: "m1",
      summary: "We agreed on launch date.",
      key_decisions: [
        { text: "Ship on Nov 15", source_quote: "Let's ship Nov 15." },
        { text: "Adopt design system", source_quote: null },
      ],
      open_questions: ["Who owns analytics?"],
      generated_at: "2025-11-01T00:00:00.000Z",
    },
    action_items: [
      {
        id: "a1",
        meeting_id: "m1",
        owner: "Alice",
        task_description: "Send the report",
        due_date: "2025-12-01",
        priority: "high",
        status: "open",
        source_quote: "Alice, send the report by Dec 1.",
        created_at: "2025-11-01T00:00:00.000Z",
        updated_at: "2025-11-01T00:00:00.000Z",
      },
      {
        id: "a2",
        meeting_id: "m1",
        owner: "Bob",
        task_description: "Book the room",
        due_date: null,
        priority: "low",
        status: "done",
        source_quote: null,
        created_at: "2025-11-01T00:00:00.000Z",
        updated_at: "2025-11-01T00:00:00.000Z",
      },
    ],
    ...overrides,
  };
}

describe("MarkdownService.render", () => {
  it("renders the full document with summary, decisions, questions, items", () => {
    const md = renderer.render(detail());
    expect(md).toContain("# Sprint planning");
    expect(md).toContain("- **Date:** 2025-11-01");
    expect(md).toContain("- **Participants:** Alice, Bob");
    expect(md).toContain("## Summary\n\nWe agreed on launch date.");
    expect(md).toContain("## Key Decisions");
    expect(md).toContain("- Ship on Nov 15");
    expect(md).toContain("  - > Let's ship Nov 15.");
    expect(md).toContain("## Open Questions");
    expect(md).toContain("- Who owns analytics?");
    expect(md).toContain("## Action Items");
    expect(md).toContain("| Owner | Task | Due | Priority | Status |");
    expect(md).toContain("| Alice | Send the report | 2025-12-01 | High | Open |");
    expect(md).toContain("| Bob | Book the room | — | Low | Done |");
  });

  it("emits a source-quotes section only when items have quotes", () => {
    const md = renderer.render(detail());
    expect(md).toContain("### Source quotes");
    expect(md).toContain("**Alice — Send the report**");
    expect(md).toContain("  - > Alice, send the report by Dec 1.");
  });

  it("escapes pipe characters inside table cells", () => {
    const d = detail({
      action_items: [
        {
          id: "a3",
          meeting_id: "m1",
          owner: "Carol | Co-owner",
          task_description: "Pipe | in | task",
          due_date: null,
          priority: "medium",
          status: "open",
          source_quote: null,
          created_at: "2025-11-01T00:00:00.000Z",
          updated_at: "2025-11-01T00:00:00.000Z",
        },
      ],
    });
    const md = renderer.render(d);
    expect(md).toContain("| Carol \\| Co-owner | Pipe \\| in \\| task |");
  });

  it("falls back to placeholders when sections are empty", () => {
    const d = detail({
      summary: null,
      action_items: [],
    });
    const md = renderer.render(d);
    expect(md).toContain("## Summary\n\n_No summary generated yet._");
    expect(md).toContain("## Key Decisions\n\n_None recorded._");
    expect(md).toContain("## Open Questions\n\n_None recorded._");
    expect(md).toContain("## Action Items\n\n_None recorded._");
  });

  it("omits participants line when there are none", () => {
    const d = detail({
      meeting: { ...detail().meeting, participants: [] },
    });
    const md = renderer.render(d);
    expect(md).not.toContain("**Participants:**");
  });

  it("collapses newlines inside task descriptions to spaces (table safety)", () => {
    const d = detail({
      action_items: [
        {
          id: "a4",
          meeting_id: "m1",
          owner: "Dee",
          task_description: "First line\nsecond line",
          due_date: null,
          priority: "high",
          status: "in_progress",
          source_quote: null,
          created_at: "2025-11-01T00:00:00.000Z",
          updated_at: "2025-11-01T00:00:00.000Z",
        },
      ],
    });
    const md = renderer.render(d);
    expect(md).toContain("| Dee | First line second line | — | High | In Progress |");
    expect(md).not.toMatch(/First line\nsecond/);
  });
});
