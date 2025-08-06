import { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { motion } from 'framer-motion';
import { userProfileStore, isAuthenticatedStore } from '~/lib/stores/user';
import { useClerkSync } from '~/lib/auth/clerk.client';
import { LoginForm } from './LoginForm';
import { AuthErrorBoundary, useAuthErrorReporting } from './AuthErrorBoundary';
import { classNames } from '~/utils/classNames';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
  requireAuth?: boolean;
  loadingComponent?: React.ReactNode;
  className?: string;
}

export const AuthGuard = ({
  children,
  fallback,
  redirectTo = '/',
  requireAuth = true,
  loadingComponent,
  className,
}: AuthGuardProps) => {
  const [showFallback, setShowFallback] = useState(false);
  const isAuthenticated = useStore(isAuthenticatedStore);

  // const _user = useStore(userProfileStore); // Commented out as unused
  const { isLoaded, isSignedIn } = useClerkSync();
  const { reportError } = useAuthErrorReporting();

  useEffect(() => {
    try {
      if (isLoaded && requireAuth && !isSignedIn) {
        // Small delay to prevent flash
        const timer = setTimeout(() => setShowFallback(true), 100);
        return () => clearTimeout(timer);
      } else {
        setShowFallback(false);
        return undefined;
      }
    } catch (error) {
      reportError(error as Error, { context: 'AuthGuard useEffect' });
      setShowFallback(true);

      return undefined;
    }
  }, [isLoaded, isSignedIn, requireAuth, reportError]);

  // Show loading state while Clerk is initializing
  if (!isLoaded) {
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }

    return (
      <div
        className={classNames(
          'flex items-center justify-center min-h-screen bg-bolt-elements-background-depth-1',
          className,
        )}
      >
        <div className="text-center">
          <div className="w-8 h-8 mx-auto mb-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-bolt-elements-textSecondary">Loading...</p>
        </div>
      </div>
    );
  }

  // If authentication is required but user is not authenticated
  if (requireAuth && (!isSignedIn || !isAuthenticated)) {
    if (showFallback) {
      if (fallback) {
        return <>{fallback}</>;
      }

      return (
        <div
          className={classNames(
            'min-h-screen bg-bolt-elements-background-depth-1 flex flex-col items-center justify-center p-4',
            className,
          )}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-md"
          >
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-bolt-elements-textPrimary mb-4">Welcome to Mojo</h1>
              <p className="text-lg text-bolt-elements-textSecondary">
                Sign in to start building amazing projects with AI
              </p>
            </div>
            <LoginForm redirectUrl={redirectTo} onSuccess={() => setShowFallback(false)} />
          </motion.div>
        </div>
      );
    }

    // Show loading state during the delay
    return (
      <div
        className={classNames(
          'flex items-center justify-center min-h-screen bg-bolt-elements-background-depth-1',
          className,
        )}
      >
        <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If authentication is not required or user is authenticated
  return <AuthErrorBoundary>{children}</AuthErrorBoundary>;
};

// Higher-order component version
export function withAuthGuard<P extends object>(
  // eslint-disable-next-line @typescript-eslint/naming-convention
  Component: React.ComponentType<P>,
  options: Omit<AuthGuardProps, 'children'> = {},
) {
  return function AuthGuardedComponent(props: P) {
    return (
      <AuthGuard {...options}>
        <Component {...props} />
      </AuthGuard>
    );
  };
}

// Hook for checking authentication status
export function useAuthGuard(requireAuth: boolean = true) {
  const isAuthenticated = useStore(isAuthenticatedStore);
  const user = useStore(userProfileStore);
  const { isLoaded, isSignedIn } = useClerkSync();

  return {
    isLoaded,
    isAuthenticated: isSignedIn && isAuthenticated,
    user,
    canAccess: !requireAuth || (isSignedIn && isAuthenticated),
    isLoading: !isLoaded,
  };
}

// Component for protecting specific sections within a page
interface ProtectedSectionProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showLoginPrompt?: boolean;
  className?: string;
}

export const ProtectedSection = ({ children, fallback, showLoginPrompt = true, className }: ProtectedSectionProps) => {
  const { canAccess, isLoading } = useAuthGuard();

  if (isLoading) {
    return (
      <div className={classNames('flex items-center justify-center p-8', className)}>
        <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!canAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (showLoginPrompt) {
      return (
        <div
          className={classNames(
            'p-6 bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor rounded-lg text-center',
            className,
          )}
        >
          <div className="i-ph:lock text-2xl text-bolt-elements-textTertiary mb-3" />
          <h3 className="text-lg font-medium text-bolt-elements-textPrimary mb-2">Sign in required</h3>
          <p className="text-sm text-bolt-elements-textSecondary mb-4">
            You need to be signed in to access this feature.
          </p>
          <button
            onClick={() => {
              // This would trigger sign in
              console.log('Sign in clicked');
            }}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors"
          >
            Sign in
          </button>
        </div>
      );
    }

    return null;
  }

  return <>{children}</>;
};
