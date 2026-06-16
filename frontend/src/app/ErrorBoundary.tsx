import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * App-level safety net for render-time crashes. Async / promise errors are
 * handled by React Query (`useQuery.isError`, mutation `onError`) and the
 * toast system; this boundary catches what React itself surfaces.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render(): ReactNode {
    if (!this.state.error) return this.props.children;

    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-rose-900 shadow-sm">
          <h1 className="text-lg font-semibold">The app hit an unexpected error</h1>
          <p className="mt-2 text-sm">{this.state.error.message}</p>
          <div className="mt-4 flex gap-2">
            <button className="btn-primary" onClick={this.reset}>
              Try again
            </button>
            <button
              className="btn-secondary"
              onClick={() => window.location.assign("/")}
            >
              Go home
            </button>
          </div>
        </div>
      </div>
    );
  }
}
