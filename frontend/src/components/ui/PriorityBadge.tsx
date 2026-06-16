import { clsx } from "clsx";
import type { Priority } from "../../types/api";

const styles: Record<Priority, string> = {
  high: "bg-rose-100 text-rose-800",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-slate-100 text-slate-700",
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={clsx("badge capitalize", styles[priority])}>
      {priority}
    </span>
  );
}
