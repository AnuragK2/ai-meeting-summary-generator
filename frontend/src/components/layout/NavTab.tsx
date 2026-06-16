import { NavLink } from "react-router-dom";
import { clsx } from "clsx";

export function NavTab({
  to,
  label,
  end,
}: {
  to: string;
  label: string;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        clsx(
          "rounded-md px-3 py-2 text-sm font-medium transition",
          isActive
            ? "bg-indigo-600 text-white shadow"
            : "text-slate-600 hover:bg-slate-200 hover:text-slate-900",
        )
      }
    >
      {label}
    </NavLink>
  );
}
