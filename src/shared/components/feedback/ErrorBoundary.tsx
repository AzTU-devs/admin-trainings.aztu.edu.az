import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error("[ErrorBoundary]", error, info.componentStack);
    }
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (error) {
      if (this.props.fallback) return this.props.fallback(error, this.reset);
      return <DefaultFallback error={error} onReset={this.reset} />;
    }
    return this.props.children;
  }
}

function DefaultFallback({ error, onReset }: { error: Error; onReset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper p-6 text-ink">
      <div className="w-full max-w-md rounded-[28px] border border-line bg-surface p-8 shadow-[var(--shadow-md)]">
        <div className="mb-4 flex items-center gap-3.5">
          <div className="grid size-11 shrink-0 place-items-center rounded-full bg-danger-tint text-danger">
            <svg viewBox="0 0 24 24" fill="none" className="size-5" stroke="currentColor" strokeWidth="2">
              <path d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="font-display text-xl font-bold tracking-[-0.018em] text-ink">Something went wrong</h1>
        </div>
        <p className="mb-7 break-words text-sm leading-relaxed text-ink-2">
          {error.message || "An unexpected error occurred."}
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onReset}
            className="h-11 flex-1 rounded-full bg-navy px-5 text-sm font-semibold text-on-navy transition-colors hover:bg-navy-hover"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="h-11 flex-1 rounded-full bg-surface px-5 text-sm font-semibold text-ink shadow-[inset_0_0_0_1px_var(--line-2)] transition-shadow hover:shadow-[inset_0_0_0_1px_var(--ink-3)]"
          >
            Reload
          </button>
        </div>
      </div>
    </div>
  );
}
