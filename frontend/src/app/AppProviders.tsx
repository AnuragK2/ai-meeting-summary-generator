import type { ReactNode } from "react";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { queryClient } from "../lib/queryClient";
import { ErrorBoundary } from "./ErrorBoundary";

/**
 * Aggregates every top-level provider so `main.tsx` stays minimal and tests
 * (if added) can wrap components in the same context.
 *
 * Order matters: ErrorBoundary outermost so any provider crash is caught;
 * Toaster mounted so toasts can render above the app shell.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          {children}
          <Toaster
            position="top-right"
            richColors
            closeButton
            expand
            duration={3500}
          />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
