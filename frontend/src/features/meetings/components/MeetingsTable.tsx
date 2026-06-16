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

function MeetingCard({ meeting: m }: { meeting: MeetingListRow }) {
  return (
    <Link
      to={`/meetings/${m.id}`}
      className="block rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:bg-slate-50 active:bg-slate-100"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 flex-1 break-words font-medium text-indigo-700">
          {m.title}
        </h3>
        <ExtractionStatusBadge status={m.extraction_status} />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-slate-600">
        <div>
          <dt className="font-medium text-slate-500">Date</dt>
          <dd className="mt-0.5">{safeFormatDate(m.date)}</dd>
        </div>
        <div>
          <dt className="font-medium text-slate-500">Action items</dt>
          <dd className="mt-0.5">{m.action_item_count}</dd>
        </div>
        {m.participants.length > 0 && (
          <div className="col-span-2">
            <dt className="font-medium text-slate-500">Participants</dt>
            <dd className="mt-0.5 break-words">{m.participants.join(", ")}</dd>
          </div>
        )}
      </dl>
    </Link>
  );
}

export function MeetingsTable({ meetings }: { meetings: MeetingListRow[] }) {
  return (
    <>
      <div className="space-y-3 md:hidden">
        {meetings.map((m) => (
          <MeetingCard key={m.id} meeting={m} />
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm md:block">
        <div className="overflow-x-auto">
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
                  <td className="max-w-xs px-4 py-3">
                    <Link
                      to={`/meetings/${m.id}`}
                      className="font-medium text-indigo-700 hover:underline"
                    >
                      {m.title}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                    {safeFormatDate(m.date)}
                  </td>
                  <td className="max-w-[12rem] px-4 py-3 text-sm text-slate-600">
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
      </div>
    </>
  );
}
