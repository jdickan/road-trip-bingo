import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : String(error),
    };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="space-y-2">
          <p className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-muted-foreground">
            Road Trip Bingo · Data Cockpit
          </p>
          <h1 className="text-2xl font-editorial italic text-foreground">
            Something went wrong
          </h1>
          {this.state.message && (
            <p className="text-sm text-muted-foreground max-w-[50ch] mx-auto font-mono">
              {this.state.message}
            </p>
          )}
        </div>
        <button
          onClick={() => window.location.reload()}
          className="font-mono text-[10.5px] tracking-[0.18em] uppercase border border-border px-5 py-2.5 hover:bg-muted/40 transition-colors"
        >
          Reload the page
        </button>
      </div>
    );
  }
}
