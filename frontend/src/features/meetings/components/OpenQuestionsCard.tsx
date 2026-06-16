import type { MeetingSummary } from "../../../types/api";

export function OpenQuestionsCard({
  summary,
}: {
  summary: MeetingSummary | null;
}) {
  return (
    <div className="card">
      <h2 className="mb-2 text-lg font-semibold">Open questions</h2>
      {summary && summary.open_questions.length > 0 ? (
        <ul className="space-y-2 text-sm text-slate-700">
          {summary.open_questions.map((q, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-slate-400">•</span>
              <span>{q}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm italic text-slate-500">None recorded.</p>
      )}
    </div>
  );
}
