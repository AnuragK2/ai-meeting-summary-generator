import { useMemo, useState } from "react";
import { ErrorBanner } from "../../../components/ui/ErrorBanner";
import { Spinner } from "../../../components/ui/Spinner";
import { formatApiError } from "../../../lib/apiClient";
import { isOverdueDate } from "../../../lib/formatDate";
import type { ActionItemFilters as Filters } from "../../../types/api";
import { useActionItems } from "../api/useActionItems";
import { ActionItemCard } from "../components/ActionItemCard";
import { ActionItemFilters } from "../components/ActionItemFilters";
import { StatCard } from "../components/StatCard";

export function ActionItemsDashboardPage() {
  const [filters, setFilters] = useState<Filters>({});
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
