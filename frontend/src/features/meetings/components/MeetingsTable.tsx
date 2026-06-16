import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import type { MeetingListRow } from "../../../types/api";
import { ExtractionStatusBadge } from "../../../components/ui/ExtractionStatusBadge";
import { safeFormatDate } from "../../../lib/formatDate";

function Th({ children }: { children: ReactNode }) {
  return (
    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
      {children}
    </th>
  );
}

export function MeetingsTable({ meetings }: { meetings: MeetingListRow[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <Th>Title</Th>
            <Th>Date</Th>
            <Th>Participants</Th>
            <Th>Status</Th>
            <Th>Action items</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {meetings.map((m) => (
            <tr key={m.id} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                <Link
                  to={`/meetings/${m.id}`}
                  className="font-medium text-indigo-700 hover:underline"
                >
                  {m.title}
                </Link>
              </td>
              <td className="px-4 py-3 text-sm text-slate-600">
                {safeFormatDate(m.date)}
              </td>
              <td className="px-4 py-3 text-sm text-slate-600">
                {m.participants.length > 0 ? m.participants.join(", ") : "—"}
              </td>
              <td className="px-4 py-3">
                <ExtractionStatusBadge status={m.extraction_status} />
              </td>
              <td className="px-4 py-3 text-sm text-slate-600">
                {m.action_item_count}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
