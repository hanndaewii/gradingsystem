import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches render errors so a single broken screen shows a recoverable
 * message instead of a blank page. The portal's data is never lost — the
 * error boundary only replaces the view.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Unhandled UI error:", error, info.componentStack);
  }

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="ui-crash">
        <h2 className="ui-crash__title">Something went wrong on this screen</h2>
        <p className="ui-crash__body">
          The portal hit an unexpected error. Your grades and courses are saved — reloading usually clears it.
        </p>
        <pre className="ui-crash__msg">{error.message || String(error)}</pre>
        <div className="ui-crash__actions">
          <button
            type="button"
            className="ui-btn ui-btn--primary"
            onClick={() => window.location.reload()}
          >
            Reload the portal
          </button>
          <button
            type="button"
            className="ui-btn ui-btn--secondary"
            onClick={() => this.setState({ error: null })}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
}
