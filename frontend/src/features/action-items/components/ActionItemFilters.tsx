import type {
  ActionItemFilters as Filters,
  ActionItemStatus,
  Priority,
} from "../../../types/api";

interface Props {
  filters: Filters;
  onChange: (next: Filters) => void;
}

export function ActionItemFilters({ filters, onChange }: Props) {
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    const next = { ...filters, [key]: value };
    if (value === "" || value === undefined || value === null) delete next[key];
    onChange(next);
  };

  return (
    <div className="card grid grid-cols-1 gap-3 sm:grid-cols-5">
      <div>
        <label className="label text-xs">Owner</label>
        <input
          className="input"
          placeholder="Search owner…"
          value={filters.owner ?? ""}
          onChange={(e) => set("owner", e.target.value)}
        />
      </div>
      <div>
        <label className="label text-xs">Status</label>
        <select
          className="select"
          value={filters.status ?? ""}
          onChange={(e) =>
            set("status", (e.target.value || undefined) as ActionItemStatus | undefined)
          }
        >
          <option value="">All</option>
          <option value="open">Open</option>
          <option value="in_progress">In progress</option>
          <option value="done">Done</option>
        </select>
      </div>
      <div>
        <label className="label text-xs">Priority</label>
        <select
          className="select"
          value={filters.priority ?? ""}
          onChange={(e) =>
            set("priority", (e.target.value || undefined) as Priority | undefined)
          }
        >
          <option value="">All</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>
      <div>
        <label className="label text-xs">Due before</label>
        <input
          type="date"
          className="input"
          value={filters.due_before ?? ""}
          onChange={(e) => set("due_before", e.target.value || undefined)}
        />
      </div>
      <div className="flex items-end">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            checked={!!filters.overdue}
            onChange={(e) => set("overdue", e.target.checked || undefined)}
          />
          Overdue only
        </label>
      </div>
    </div>
  );
}
