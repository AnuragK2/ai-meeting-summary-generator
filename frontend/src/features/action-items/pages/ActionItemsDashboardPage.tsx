import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { ErrorBanner } from "../../../components/ui/ErrorBanner";
import { Spinner } from "../../../components/ui/Spinner";
import { formatApiError } from "../../../lib/apiClient";
import { isOverdueDate } from "../../../lib/formatDate";
import type {
  ActionItemFilters as Filters,
  ActionItemStatus,
  Priority,
} from "../../../types/api";
import { useActionItems } from "../api/useActionItems";
import { ActionItemCard } from "../components/ActionItemCard";
import { ActionItemFilters } from "../components/ActionItemFilters";
import { StatCard } from "../components/StatCard";

const FILTER_KEYS = [
  "owner",
  "status",
  "priority",
  "due_before",
  "overdue",
  "meeting_id",
] as const;

function paramsToFilters(params: URLSearchParams): Filters {
  const f: Filters = {};
  const owner = params.get("owner");
  if (owner) f.owner = owner;
  const status = params.get("status");
  if (status === "open" || status === "in_progress" || status === "done") {
    f.status = status as ActionItemStatus;
  }
  const priority = params.get("priority");
  if (priority === "low" || priority === "medium" || priority === "high") {
    f.priority = priority as Priority;
  }
  const dueBefore = params.get("due_before");
  if (dueBefore) f.due_before = dueBefore;
  if (params.get("overdue") === "true") f.overdue = true;
  const meetingId = params.get("meeting_id");
  if (meetingId) f.meeting_id = meetingId;
  return f;
}

export function ActionItemsDashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => paramsToFilters(searchParams), [searchParams]);
  const setFilters = (next: Filters) => {
    const nextParams = new URLSearchParams(searchParams);
    // Wipe filter keys we own, then set whatever is in `next`. Preserves
    // any non-filter query params another caller might have added.
    for (const k of FILTER_KEYS) nextParams.delete(k);
    for (const [k, v] of Object.entries(next)) {
      if (v === undefined || v === null || v === "" || v === false) continue;
      nextParams.set(k, String(v));
    }
    setSearchParams(nextParams, { replace: true });
  };
  const { data, isLoading, isError, error, refetch } = useActionItems(filters);

  const totals = useMemo(
    () => ({
      all: data?.length ?? 0,
      overdue:
        data?.filter((a) => isOverdueDate(a.due_date, a.status)).length ?? 0,
      done: data?.filter((a) => a.status === "done").length ?? 0,
    }),
    [data],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Action dashboard</h1>
        <p className="text-sm text-slate-500">
          Every action item across every meeting. Overdue items are highlighted.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Total" value={totals.all} />
        <StatCard label="Overdue" value={totals.overdue} tone="rose" />
        <StatCard label="Done" value={totals.done} tone="emerald" />
      </div>

      <ActionItemFilters filters={filters} onChange={setFilters} />

      {isLoading && (
        <div className="card flex items-center gap-2 text-slate-600">
          <Spinner /> Loading action items…
        </div>
      )}
      {isError && (
        <ErrorBanner
          message={formatApiError(error)}
          onRetry={() => refetch()}
        />
      )}

      {data && data.length === 0 && (
        <div className="card text-center text-sm text-slate-500">
          No action items match the current filters.
        </div>
      )}

      {data && data.length > 0 && (
        <div className="space-y-3">
          {data.map((a) => (
            <ActionItemCard
              key={a.id}
              item={a}
              meetingTitle={a.meeting_title}
              meetingLink={`/meetings/${a.meeting_id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
