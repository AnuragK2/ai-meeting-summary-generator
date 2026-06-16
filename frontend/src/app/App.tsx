import { Header } from "../components/layout/Header";
import { AppRoutes } from "./AppRoutes";

export function App() {
  return (
    <div className="min-h-full bg-slate-50">
      <Header />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <AppRoutes />
      </main>
    </div>
  );
}
