import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { ErrorBanner } from "../../../components/ui/ErrorBanner";
import { ExtractionStatusBadge } from "../../../components/ui/ExtractionStatusBadge";
import { Spinner } from "../../../components/ui/Spinner";
import { formatApiError } from "../../../lib/apiClient";
import { safeFormatDate } from "../../../lib/formatDate";
import { notify } from "../../../lib/toast";
import { ActionItemCard } from "../../action-items/components/ActionItemCard";
import {
  useDeleteMeeting,
  useMeeting,
  useRegenerateMeeting,
} from "../api/useMeetings";
import { meetingsApi } from "../api/meetingsApi";
import { DecisionsCard } from "../components/DecisionsCard";
import { OpenQuestionsCard } from "../components/OpenQuestionsCard";
import { SummaryCard } from "../components/SummaryCard";
import type { ActionItemStatus, Priority } from "../../../types/api";

const STATUS_FILTERS: Array<ActionItemStatus | "all"> = [
  "all",
  "open",
  "in_progress",
  "done",
];
const PRIORITY_FILTERS: Array<Priority | "all"> = [
  "all",
  "high",
  "medium",
  "low",
];

export function MeetingDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const detail = useMeeting(id);
  const regenerate = useRegenerateMeeting(id);
  const remove = useDeleteMeeting(id);

  const [statusFilter, setStatusFilter] = useState<ActionItemStatus | "all">(
    "all",
  );
  const [priorityFilter, setPriorityFilter] = useState<Priority | "all">("all");
  const [deleteOpen, setDeleteOpen] = useState(false);

  const filteredItems = useMemo(() => {
    const items = detail.data?.action_items ?? [];
    return items.filter(
      (a) =>
        (statusFilter === "all" || a.status === statusFilter) &&
        (priorityFilter === "all" || a.priority === priorityFilter),
    );
  }, [detail.data, statusFilter, priorityFilter]);

  async function copyMarkdown() {
    if (!navigator.clipboard) {
      notify.error("Clipboard not available in this browser");
      return;
    }
    notify.promise(
      meetingsApi
        .exportMarkdown(id)
        .then((md) => navigator.clipboard.writeText(md)),
      {
        loading: "Copying markdown…",
        success: "Markdown copied to clipboard",
        error: "Could not copy markdown",
      },
    );
  }

  if (detail.isLoading) {
    return (
      <div className="card flex items-center gap-2 text-slate-600">
        <Spinner /> Loading meeting…
      </div>
    );
  }

  if (detail.isError) {
    return (
      <ErrorBanner
        message={formatApiError(detail.error)}
        onRetry={() => detail.refetch()}
      />
    );
  }

  const d = detail.data!;
  const m = d.meeting;
  const status = m.extraction_status;
  const extracting = regenerate.isPending || status === "processing";

  function onConfirmDelete() {
    remove.mutate(undefined, {
      onSuccess: () => {
        setDeleteOpen(false);
        navigate("/");
      },
      // Keep the dialog open on error so the user can retry; the toast
      // surfaces the failure reason.
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/" className="text-xs text-slate-500 hover:text-slate-700">
            ← All meetings
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">{m.title}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <span>{safeFormatDate(m.date, "PPP")}</span>
            {m.participants.length > 0 && (
              <span>{m.participants.join(", ")}</span>
            )}
            <ExtractionStatusBadge status={status} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="btn-secondary"
            onClick={() => regenerate.mutate()}
            disabled={extracting}
          >
            {extracting && <Spinner />}
            {extracting ? "Regenerating…" : "Regenerate"}
          </button>
          <a
            className="btn-secondary"
            href={meetingsApi.exportMarkdownUrl(id)}
            target="_blank"
            rel="noreferrer"
          >
            Export .md
          </a>
          <button className="btn-secondary" onClick={copyMarkdown}>
            Copy markdown
          </button>
          <button
            className="btn-danger"
            onClick={() => setDeleteOpen(true)}
            disabled={remove.isPending}
          >
            {remove.isPending ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>

      {status === "failed" && (
        <ErrorBanner
          message={
            m.extraction_error ??
            "Extraction failed. Click Regenerate to try again."
          }
          onRetry={() => regenerate.mutate()}
        />
      )}

      {extracting && (
        <div className="card flex items-center gap-2 text-slate-600">
          <Spinner /> Running AI extraction… this may take a few seconds.
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SummaryCard summary={d.summary} />
        <OpenQuestionsCard summary={d.summary} />
      </section>

      <DecisionsCard summary={d.summary} />

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-lg font-semibold">
            Action items{" "}
            <span className="text-sm font-normal text-slate-500">
              ({d.action_items.length})
            </span>
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <label className="text-xs font-medium text-slate-500">
              Status:
            </label>
            <select
              className="select w-auto py-1"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as ActionItemStatus | "all")
              }
            >
              {STATUS_FILTERS.map((s) => (
                <option key={s} value={s}>
                  {s === "all"
                    ? "All"
                    : s === "in_progress"
                      ? "In progress"
                      : s[0].toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
            <label className="text-xs font-medium text-slate-500">
              Priority:
            </label>
            <select
              className="select w-auto py-1"
              value={priorityFilter}
              onChange={(e) =>
                setPriorityFilter(e.target.value as Priority | "all")
              }
            >
              {PRIORITY_FILTERS.map((p) => (
                <option key={p} value={p}>
                  {p === "all" ? "All" : p[0].toUpperCase() + p.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="card text-center text-sm text-slate-500">
            {d.action_items.length === 0
              ? "No action items extracted."
              : "No action items match the current filters."}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item) => (
              <ActionItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>

      <details className="card">
        <summary className="cursor-pointer text-sm font-medium text-slate-700">
          Show raw transcript
        </summary>
        <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap text-xs text-slate-700">
          {m.raw_transcript}
        </pre>
      </details>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete this meeting?"
        description={
          <>
            This will permanently remove{" "}
            <span className="font-medium text-slate-900">{m.title}</span>, its
            AI-generated summary, and all{" "}
            <span className="font-medium text-slate-900">
              {d.action_items.length} action item
              {d.action_items.length === 1 ? "" : "s"}
            </span>
            . This cannot be undone.
          </>
        }
        confirmLabel="Delete meeting"
        tone="danger"
        loading={remove.isPending}
        onConfirm={onConfirmDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}
