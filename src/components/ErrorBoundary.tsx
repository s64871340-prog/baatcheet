import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
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
    return {
      hasError: true,
      message: error.message || 'An unexpected error occurred.',
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#F0F2F5] dark:bg-[#111B21] p-6">
          <div className="max-w-md w-full bg-white dark:bg-[#202C33] border border-slate-200 dark:border-slate-700 rounded-2xl p-6 flex flex-col gap-4">
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Connection Interrupted
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 break-words">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="self-start px-4 py-2.5 rounded-lg bg-[#008069] hover:bg-[#006d59] text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
