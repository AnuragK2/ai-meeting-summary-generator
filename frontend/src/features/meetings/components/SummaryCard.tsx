import type { MeetingSummary } from "../../../types/api";

export function SummaryCard({ summary }: { summary: MeetingSummary | null }) {
  return (
    <div className="card lg:col-span-2">
      <h2 className="mb-2 text-lg font-semibold">Summary</h2>
      {summary ? (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
          {summary.summary}
        </p>
      ) : (
        <p className="text-sm italic text-slate-500">
          No summary yet. Run extraction.
        </p>
      )}
    </div>
  );
}
