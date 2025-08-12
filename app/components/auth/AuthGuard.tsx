import { useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { userProfileStore } from '~/lib/stores/user';
import { AuthErrorBoundary } from './AuthErrorBoundary';
import { useAuth } from '@clerk/remix';

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
  fallback: _fallback,
  redirectTo: _redirectTo = '/',
  requireAuth = true,
  loadingComponent: _loadingComponent,
  className: _className,
}: AuthGuardProps) => {
  // Authentication disabled - always allow access
  useEffect(() => {
    // No-op: authentication disabled
  }, [requireAuth]);

  // Authentication disabled - no loading state needed

  // Authentication disabled - always show children
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
export function useAuthGuard(_requireAuth: boolean = true) {
  const { isLoaded, isSignedIn } = useAuth();
  const user = useStore(userProfileStore);

  return {
    isLoaded,
    isAuthenticated: isSignedIn,
    user,
    canAccess: isSignedIn,
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

export const ProtectedSection = ({
  children,
  fallback: _fallback,
  showLoginPrompt: _showLoginPrompt = true,
  className: _className,
}: ProtectedSectionProps) => {
  // Authentication disabled - always show children
  return <>{children}</>;
};
