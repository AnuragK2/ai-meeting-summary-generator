import { clsx } from "clsx";
import type { ExtractionStatus } from "../../types/api";

const labels: Record<ExtractionStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
};

const styles: Record<ExtractionStatus, string> = {
  pending: "bg-slate-100 text-slate-700",
  processing: "bg-amber-100 text-amber-800",
  completed: "bg-emerald-100 text-emerald-800",
  failed: "bg-rose-100 text-rose-800",
};

export function ExtractionStatusBadge({
  status,
}: {
  status: ExtractionStatus;
}) {
  return (
    <span className={clsx("badge", styles[status])}>{labels[status]}</span>
  );
}
