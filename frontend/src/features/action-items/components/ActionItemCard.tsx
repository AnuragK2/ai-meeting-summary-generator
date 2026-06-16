import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { Spinner } from "../../../components/ui/Spinner";
import { formatApiError } from "../../../lib/apiClient";
import { isOverdueDate } from "../../../lib/formatDate";
import type {
  ActionItem,
  ActionItemStatus,
  Priority,
} from "../../../types/api";
import { useUpdateActionItem } from "../api/useActionItems";

interface Props {
  item: ActionItem;
  meetingTitle?: string;
  meetingLink?: string;
  highlightOverdue?: boolean;
}

const STATUSES: ActionItemStatus[] = ["open", "in_progress", "done"];
const PRIORITIES: Priority[] = ["low", "medium", "high"];
const SAVED_INDICATOR_MS = 1500;

const statusLabel = (s: ActionItemStatus) =>
  s === "in_progress" ? "In progress" : s === "done" ? "Done" : "Open";

export function ActionItemCard({
  item,
  meetingTitle,
  meetingLink,
  highlightOverdue = true,
}: Props) {
  const update = useUpdateActionItem(item.id, item.meeting_id);

  const [owner, setOwner] = useState(item.owner);
  const [dueDate, setDueDate] = useState(item.due_date ?? "");
  const [task, setTask] = useState(item.task_description);

  // Track what the server confirms — that is what we are allowed to clobber
  // local state with. If the user typed AFTER the last save fired, the local
  // value will differ from the committed ref and we leave it alone so the
  // user does not lose in-flight edits while a previous PATCH is still on
  // the wire (or the query has just re-fetched).
  const committedRef = useRef({
    owner: item.owner,
    dueDate: item.due_date ?? "",
    task: item.task_description,
  });

  useEffect(() => {
    const serverOwner = item.owner;
    const serverDue = item.due_date ?? "";
    const serverTask = item.task_description;

    setOwner((prev) => (prev === committedRef.current.owner ? serverOwner : prev));
    setDueDate((prev) =>
      prev === committedRef.current.dueDate ? serverDue : prev,
    );
    setTask((prev) => (prev === committedRef.current.task ? serverTask : prev));

    committedRef.current = {
      owner: serverOwner,
      dueDate: serverDue,
      task: serverTask,
    };
  }, [item.id, item.owner, item.due_date, item.task_description]);

  const overdue = highlightOverdue && isOverdueDate(item.due_date, item.status);

  // Show a brief "Saved" hint after every successful PATCH. We watch
  // updated_at so consecutive successful saves each re-trigger the pulse.
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const lastSeenUpdatedAt = useRef<string | null>(null);
  useEffect(() => {
    if (!update.isSuccess || !update.data?.updated_at) return;
    if (update.data.updated_at === lastSeenUpdatedAt.current) return;
    lastSeenUpdatedAt.current = update.data.updated_at;
    setSavedAt(Date.now());
    const t = window.setTimeout(() => setSavedAt(null), SAVED_INDICATOR_MS);
    return () => window.clearTimeout(t);
  }, [update.isSuccess, update.data?.updated_at]);

  // Helper: only fire a mutation if the value actually changed AND no save
  // is already in flight (the disabled prop guards the inputs, but selects
  // can still change and double-clicks happen).
  function safeMutate(patch: Parameters<typeof update.mutate>[0]) {
    if (update.isPending) return;
    update.mutate(patch);
  }

  function commitOwner() {
    const trimmed = owner.trim() || "Unassigned";
    if (trimmed === item.owner) {
      setOwner(trimmed);
      return;
    }
    committedRef.current.owner = trimmed;
    safeMutate({ owner: trimmed });
  }
  function commitTask() {
    const trimmed = task.trim();
    if (!trimmed || trimmed === item.task_description) return;
    committedRef.current.task = trimmed;
    safeMutate({ task_description: trimmed });
  }
  function commitDueDate() {
    const value = dueDate || null;
    if (value === (item.due_date ?? null)) return;
    committedRef.current.dueDate = value ?? "";
    safeMutate({ due_date: value });
  }

  return (
    <div
      className={clsx(
        "rounded-lg border bg-white p-4 shadow-sm transition",
        overdue
          ? "border-rose-200 border-l-4 border-l-rose-500"
          : "border-slate-200",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <textarea
            className="input min-h-[42px] resize-none text-sm font-medium"
            value={task}
            onChange={(e) => setTask(e.target.value)}
            onBlur={commitTask}
            disabled={update.isPending}
          />
          {item.source_quote && (
            <blockquote className="mt-2 border-l-2 border-slate-300 pl-3 text-xs italic text-slate-500">
              &ldquo;{item.source_quote}&rdquo;
            </blockquote>
          )}
          {meetingTitle && meetingLink && (
            <div className="mt-2 text-xs text-slate-500">
              From{" "}
              <a className="text-indigo-700 hover:underline" href={meetingLink}>
                {meetingTitle}
              </a>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-500">
          {update.isPending && <Spinner className="h-3 w-3" />}
          {savedAt && !update.isPending && (
            <span className="font-medium text-emerald-600">Saved</span>
          )}
          {update.isError && (
            <span className="text-rose-600">{formatApiError(update.error)}</span>
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label className="label text-xs">Owner</label>
          <input
            className="input"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            onBlur={commitOwner}
            disabled={update.isPending}
          />
        </div>
        <div>
          <label className="label text-xs">Due</label>
          <input
            type="date"
            className="input"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            onBlur={commitDueDate}
            disabled={update.isPending}
          />
          {overdue && (
            <p className="mt-1 text-xs font-medium text-rose-600">Overdue</p>
          )}
        </div>
        <div>
          <label className="label text-xs">Priority</label>
          <select
            className="select"
            value={item.priority}
            onChange={(e) =>
              safeMutate({ priority: e.target.value as Priority })
            }
            disabled={update.isPending}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p[0].toUpperCase() + p.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label text-xs">Status</label>
          <select
            className="select"
            value={item.status}
            onChange={(e) =>
              safeMutate({ status: e.target.value as ActionItemStatus })
            }
            disabled={update.isPending}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
