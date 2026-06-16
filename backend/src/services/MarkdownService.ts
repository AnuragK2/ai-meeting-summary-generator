import type { MeetingDetail } from "../models/index.js";

const priorityLabel = (p: string) =>
  p === "high" ? "High" : p === "low" ? "Low" : "Medium";
const statusLabel = (s: string) =>
  s === "done" ? "Done" : s === "in_progress" ? "In Progress" : "Open";

function escapePipes(s: string): string {
  return s.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

/**
 * Pure renderer for Markdown export (Bonus A). Stateless so it can be unit
 * tested without any infrastructure.
 */
export class MarkdownService {
  render(detail: MeetingDetail): string {
    const { meeting, summary, action_items } = detail;
    const lines: string[] = [];

    lines.push(`# ${meeting.title}`);
    lines.push("");
    lines.push(`- **Date:** ${meeting.date}`);
    if (meeting.participants.length > 0) {
      lines.push(`- **Participants:** ${meeting.participants.join(", ")}`);
    }
    lines.push(`- **Extraction status:** ${meeting.extraction_status}`);
    lines.push("");

    lines.push("## Summary");
    lines.push("");
    lines.push(summary?.summary ?? "_No summary generated yet._");
    lines.push("");

    lines.push("## Key Decisions");
    lines.push("");
    if (summary && summary.key_decisions.length > 0) {
      for (const d of summary.key_decisions) {
        lines.push(`- ${d.text}`);
        if (d.source_quote) {
          lines.push(`  - > ${d.source_quote}`);
        }
      }
    } else {
      lines.push("_None recorded._");
    }
    lines.push("");

    lines.push("## Open Questions");
    lines.push("");
    if (summary && summary.open_questions.length > 0) {
      for (const q of summary.open_questions) lines.push(`- ${q}`);
    } else {
      lines.push("_None recorded._");
    }
    lines.push("");

    lines.push("## Action Items");
    lines.push("");
    if (action_items.length > 0) {
      lines.push("| Owner | Task | Due | Priority | Status |");
      lines.push("| --- | --- | --- | --- | --- |");
      for (const a of action_items) {
        lines.push(
          `| ${escapePipes(a.owner)} | ${escapePipes(a.task_description)} | ${
            a.due_date ?? "—"
          } | ${priorityLabel(a.priority)} | ${statusLabel(a.status)} |`,
        );
      }
      const quoted = action_items.filter((a) => a.source_quote);
      if (quoted.length > 0) {
        lines.push("");
        lines.push("### Source quotes");
        lines.push("");
        for (const a of quoted) {
          lines.push(`- **${a.owner} — ${a.task_description}**`);
          lines.push(`  - > ${a.source_quote}`);
        }
      }
    } else {
      lines.push("_None recorded._");
    }
    lines.push("");

    return lines.join("\n");
  }
}
