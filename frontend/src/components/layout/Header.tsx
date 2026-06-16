import { NavTab } from "./NavTab.tsx";

export function Header() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white">
            M
          </div>
          <div className="min-w-0">
            <div className="truncate text-base font-semibold leading-none sm:text-lg">
              Meet.ai
            </div>
            <div className="hidden text-xs text-slate-500 min-[380px]:block">
              AI Meeting Notes Extractor
            </div>
          </div>
        </div>
        <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5 [-webkit-overflow-scrolling:touch] sm:mx-0 sm:overflow-visible sm:pb-0">
          <NavTab to="/" label="Meetings" end />
          <NavTab to="/dashboard" label="Dashboard" />
          <NavTab to="/meetings/new" label="New meeting" />
        </nav>
      </div>
    </header>
  );
}
