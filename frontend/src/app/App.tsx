import { Header } from "../components/layout/Header";
import { AppRoutes } from "./AppRoutes";

export function App() {
  return (
    <div className="min-h-full bg-slate-50">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-8">
        <AppRoutes />
      </main>
    </div>
  );
}
