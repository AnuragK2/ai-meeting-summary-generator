import type { MeetingSummary } from "../../../types/api";

export function DecisionsCard({ summary }: { summary: MeetingSummary | null }) {
  return (
    <section className="card">
      <h2 className="mb-3 text-lg font-semibold">Key decisions</h2>
      {summary && summary.key_decisions.length > 0 ? (
        <ul className="space-y-3">
          {summary.key_decisions.map((d, i) => (
            <li key={i} className="rounded-md border border-slate-100 p-3">
              <p className="text-sm font-medium text-slate-800">{d.text}</p>
              {d.source_quote && (
                <blockquote className="mt-1 border-l-2 border-slate-300 pl-3 text-xs italic text-slate-500">
                  &ldquo;{d.source_quote}&rdquo;
                </blockquote>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm italic text-slate-500">None recorded.</p>
      )}
    </section>
  );
}
