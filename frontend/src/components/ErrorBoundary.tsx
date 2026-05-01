"use client";

import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <div className="text-center max-w-md">
            <h2 className="font-mono text-[14px] uppercase tracking-[0.08em] text-[#E34234] mb-2">
              RENDER ERROR
            </h2>
            <p className="font-mono text-[13px] text-[#8A8A8A] mb-4">
              An unexpected error occurred. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#00D9FF] hover:text-[#00C4E8] transition-colors px-3 py-1.5 border border-[rgba(255,255,255,0.08)]"
            >
              REFRESH
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
