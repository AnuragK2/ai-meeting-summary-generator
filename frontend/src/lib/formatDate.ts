import { format } from "date-fns";

export function safeFormatDate(iso: string, pattern = "PP"): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return format(d, pattern);
}

export function isOverdueDate(
  iso: string | null,
  status: string,
): boolean {
  if (!iso || status === "done") return false;
  const due = new Date(iso);
  if (Number.isNaN(due.getTime())) return false;
  const today = new Date(new Date().toDateString());
  return due < today;
}
