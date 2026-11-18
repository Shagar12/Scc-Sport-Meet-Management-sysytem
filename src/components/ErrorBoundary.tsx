import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
  detail?: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let message = error.message || 'An unexpected application error occurred.';
    let detail: string | undefined;

    try {
      const parsed = JSON.parse(message) as {
        error?: string;
        operationType?: string;
        path?: string | null;
      };
      if (parsed && parsed.error && parsed.operationType) {
        message = `Cloud sync permission error (${parsed.operationType}${
          parsed.path ? ` on ${parsed.path}` : ''
        })`;
        detail = parsed.error;
      }
    } catch {
      // Plain error message
    }

    return { hasError: true, message, detail };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('Uncaught Portal Error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#09090B] text-zinc-100 flex items-center justify-center p-6">
          <div className="max-w-lg w-full rounded-xl border border-red-500/40 bg-[#0F172A]/80 p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle className="h-6 w-6 shrink-0" aria-hidden="true" />
              <h1 className="font-display text-xl font-bold text-white">
                SCC Sports Meet Sync Notice
              </h1>
            </div>
            <p className="text-sm text-zinc-200">{this.state.message}</p>
            {this.state.detail && (
              <p className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-xs font-mono-tabular text-zinc-400 break-words">
                {this.state.detail}
              </p>
            )}
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 rounded-lg bg-white text-zinc-950 px-4 py-2 text-sm font-semibold hover:bg-zinc-200 transition-colors"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Reload Portal
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
