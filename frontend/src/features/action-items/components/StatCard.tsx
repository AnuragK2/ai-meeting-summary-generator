import { clsx } from "clsx";

export function StatCard({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: number;
  tone?: "slate" | "rose" | "emerald";
}) {
  const toneClass = clsx(
    "text-3xl font-semibold",
    tone === "rose"
      ? "text-rose-700"
      : tone === "emerald"
        ? "text-emerald-700"
        : "text-slate-800",
  );
  return (
    <div className="card flex items-center justify-between">
      <div className="text-sm font-medium text-slate-500">{label}</div>
      <div className={toneClass}>{value}</div>
    </div>
  );
}
