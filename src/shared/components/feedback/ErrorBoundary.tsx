import { Component, type ErrorInfo, type ReactNode } from "react";
import { isChunkLoadError } from "./chunkError";
import { crashDetails, errorDigest, reportCrash } from "./crashReport";
import { ErrorFallback } from "./ErrorFallback";

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
  /**
   * "screen" fills the viewport — the last-resort boundary around the whole
   * app. "page" is a card inside the dashboard shell, so a broken page keeps the
   * sidebar and header and the user can navigate away.
   */
  variant?: "screen" | "page";
}

interface State {
  error: Error | null;
  /** The id shown to the user and sent in the report (see crashReport). */
  digest: string | null;
  /** The text "Copy details" copies; filled in once React hands over the component stack. */
  details: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, digest: null, details: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    // The digest is needed for the very first fallback render, so it comes from
    // the error alone; the component stack only arrives in componentDidCatch.
    return { error, digest: errorDigest(error), details: null };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const digest = this.state.digest ?? errorDigest(error);
    // Still logged in production: the console reaches anyone debugging with the user.
    console.error(`[ErrorBoundary] ${digest}`, error, info.componentStack);
    this.setState({ details: crashDetails(error, { digest, componentStack: info.componentStack }) });
    // A chunk that failed to load after a deploy is expected, not a bug; the
    // fallback reloads it. Everything else goes to the access log so the team
    // hears about a crash without waiting for the user to write in.
    if (!isChunkLoadError(error)) reportCrash(error, { digest });
  }

  reset = () => {
    // A lazy chunk that failed to load fails again from React.lazy's cache, so
    // "Try again" would loop forever; a reload fetches the current build.
    if (this.state.error && isChunkLoadError(this.state.error)) {
      window.location.reload();
      return;
    }
    this.setState({ error: null, digest: null, details: null });
  };

  render() {
    const { error, digest, details } = this.state;
    if (error) {
      if (this.props.fallback) return this.props.fallback(error, this.reset);
      return (
        <ErrorFallback
          error={error}
          digest={digest ?? errorDigest(error)}
          details={details}
          onReset={this.reset}
          variant={this.props.variant ?? "screen"}
        />
      );
    }
    return this.props.children;
  }
}
