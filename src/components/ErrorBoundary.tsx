
import React, { Component, ErrorInfo, ReactNode } from 'react';
import Card from './common/Card';
import Button from './common/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to the console for debugging
    console.error("Uncaught error:", error, errorInfo);
  }
  
  private handleRefresh = () => {
    window.location.reload();
  }

  public render() {
    if (this.state.hasError) {
      // Render a fallback UI when an error is caught
      return (
        <div className="flex items-center justify-center h-screen bg-slate-900 p-4">
            <Card className="max-w-xl w-full text-center border border-red-500/50">
                <div className="flex flex-col items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <h1 className="text-2xl font-bold text-white mb-2">Something went wrong.</h1>
                    <p className="text-slate-400 mb-6">
                        An unexpected error occurred while rendering the application. You can try refreshing the page.
                    </p>
                    <Button onClick={this.handleRefresh}>
                        Refresh Page
                    </Button>
                    {this.state.error && (
                        <details className="mt-6 text-left w-full bg-slate-800 p-3 rounded-md">
                            <summary className="cursor-pointer text-slate-300 font-medium">Error Details</summary>
                            <pre className="text-red-300 text-xs whitespace-pre-wrap break-all font-mono mt-2 bg-slate-900 p-2 rounded">
                                {this.state.error.toString()}
                            </pre>
                        </details>
                    )}
                </div>
            </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;