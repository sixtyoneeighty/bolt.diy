import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { classNames } from '~/utils/classNames';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  className?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class AuthErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, _errorInfo: ErrorInfo) {
    console.error('Authentication Error Boundary caught an error:', error, _errorInfo);

    this.setState({
      error,
      errorInfo: _errorInfo,
    });

    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, _errorInfo);
    }

    // Log to external error reporting service if available
    if (typeof window !== 'undefined' && (window as any).errorReporting) {
      (window as any).errorReporting.captureException(error, {
        tags: { component: 'AuthErrorBoundary' },
        extra: _errorInfo,
      });
    }
  }

  private _handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  private _handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div
          className={classNames(
            'min-h-screen bg-bolt-elements-background-depth-1 flex flex-col items-center justify-center p-4',
            this.props.className,
          )}
        >
          <div className="max-w-md w-full bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor rounded-lg p-6 text-center">
            <div className="i-ph:warning-circle text-4xl text-red-600 mb-4 mx-auto" />

            <h2 className="text-xl font-semibold text-bolt-elements-textPrimary mb-2">Authentication Error</h2>

            <p className="text-sm text-bolt-elements-textSecondary mb-6">
              Something went wrong with the authentication system. This might be a temporary issue.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-6 text-left">
                <summary className="text-sm font-medium text-bolt-elements-textPrimary cursor-pointer mb-2">
                  Error Details
                </summary>
                <div className="bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor rounded p-3 text-xs font-mono">
                  <div className="text-red-600 mb-2">
                    {this.state.error.name}: {this.state.error.message}
                  </div>
                  {this.state.error.stack && (
                    <pre className="text-bolt-elements-textSecondary whitespace-pre-wrap">{this.state.error.stack}</pre>
                  )}
                </div>
              </details>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={this._handleRetry}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/20"
              >
                Try Again
              </button>

              <button
                onClick={this._handleReload}
                className="px-4 py-2 bg-bolt-elements-background-depth-3 hover:bg-bolt-elements-background-depth-4 text-bolt-elements-textPrimary text-sm font-medium rounded-md border border-bolt-elements-borderColor transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/20"
              >
                Reload Page
              </button>
            </div>

            <div className="mt-4 pt-4 border-t border-bolt-elements-borderColor">
              <p className="text-xs text-bolt-elements-textTertiary">
                If this problem persists, please contact support.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for wrapping components with error boundary
export function withAuthErrorBoundary<P extends object>(
  component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>,
) {
  return function AuthErrorBoundaryWrapper(props: P) {
    return (
      <AuthErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </AuthErrorBoundary>
    );
  };
}

// Hook for error reporting within components
export function useAuthErrorReporting() {
  const reportError = React.useCallback((error: Error, context?: Record<string, any>) => {
    console.error('Auth Error:', error, context);

    // Log to external error reporting service if available
    if (typeof window !== 'undefined' && (window as any).errorReporting) {
      (window as any).errorReporting.captureException(error, {
        tags: { component: 'AuthComponent' },
        extra: context,
      });
    }
  }, []);

  return { reportError };
}

// Specific error boundary for login/register forms
export const AuthFormErrorBoundary: React.FC<{
  children: ReactNode;
  onError?: (error: Error) => void;
}> = ({ children, onError }) => {
  return (
    <AuthErrorBoundary
      onError={(error, _errorInfo) => {
        onError?.(error);
      }}
      fallback={
        <div className="w-full max-w-md mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="i-ph:warning-circle text-red-600 text-lg" />
              <div>
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Authentication Error</h3>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  Unable to load the authentication form. Please refresh the page and try again.
                </p>
              </div>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      }
    >
      {children}
    </AuthErrorBoundary>
  );
};
