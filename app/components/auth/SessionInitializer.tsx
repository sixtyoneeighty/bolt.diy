import { useEffect } from 'react';
import { useSessionManager } from '~/lib/hooks/useSessionManager';
import { SessionExpiryWarning } from './SessionExpiryWarning';

interface SessionInitializerProps {
  children: React.ReactNode;
  showExpiryWarning?: boolean;
  showStatusIndicator?: boolean;
}

/**
 * Component that initializes session management and handles session restoration
 * Should be placed high in the component tree, typically in the app root
 */
export function SessionInitializer({
  children,
  showExpiryWarning = true,
  showStatusIndicator = false,
}: SessionInitializerProps) {
  const { sessionStatus, logout } = useSessionManager();

  // Log session status changes for debugging
  useEffect(() => {
    if (!sessionStatus.isLoading) {
      console.log('Session status updated:', {
        isAuthenticated: sessionStatus.isAuthenticated,
        sessionExpiry: sessionStatus.sessionExpiry,
        needsRefresh: sessionStatus.needsRefresh,
      });
    }
  }, [sessionStatus]);

  const handleSessionExtended = () => {
    console.log('Session extended successfully');
  };

  const handleLogout = async () => {
    try {
      await logout();
      console.log('User logged out from session expiry warning');
    } catch (error) {
      console.error('Error logging out from session expiry warning:', error);
    }
  };

  return (
    <>
      {children}

      {showExpiryWarning && <SessionExpiryWarning onExtendSession={handleSessionExtended} onLogout={handleLogout} />}

      {showStatusIndicator && process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor rounded-lg p-3 text-xs font-mono">
          <div className="text-bolt-elements-textPrimary font-semibold mb-1">Session Debug</div>
          <div className="space-y-1 text-bolt-elements-textSecondary">
            <div>Loading: {sessionStatus.isLoading ? 'Yes' : 'No'}</div>
            <div>Authenticated: {sessionStatus.isAuthenticated ? 'Yes' : 'No'}</div>
            {sessionStatus.sessionExpiry && <div>Expires: {sessionStatus.sessionExpiry.toLocaleTimeString()}</div>}
            {sessionStatus.timeUntilExpiry && (
              <div>Time left: {Math.ceil(sessionStatus.timeUntilExpiry / (60 * 1000))}m</div>
            )}
            <div>Needs refresh: {sessionStatus.needsRefresh ? 'Yes' : 'No'}</div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Higher-order component that wraps a component with session initialization
 */
export function withSessionInitializer<P extends object>(
  // eslint-disable-next-line @typescript-eslint/naming-convention
  Component: React.ComponentType<P>,
  options?: {
    showExpiryWarning?: boolean;
    showStatusIndicator?: boolean;
  },
) {
  return function SessionInitializedComponent(props: P) {
    return (
      <SessionInitializer
        showExpiryWarning={options?.showExpiryWarning}
        showStatusIndicator={options?.showStatusIndicator}
      >
        <Component {...props} />
      </SessionInitializer>
    );
  };
}
