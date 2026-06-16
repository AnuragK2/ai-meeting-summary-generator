import { NavTab } from "./NavTab.tsx";

export function Header() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold">
            M
          </div>
          <div>
            <div className="text-lg font-semibold leading-none">Meet.ai</div>
            <div className="text-xs text-slate-500">
              AI Meeting Notes Extractor
            </div>
          </div>
        </div>
        <nav className="flex items-center gap-1">
          <NavTab to="/" label="Meetings" end />
          <NavTab to="/dashboard" label="Action Dashboard" />
          <NavTab to="/meetings/new" label="New meeting" />
        </nav>
      </div>
    </header>
  );
}
