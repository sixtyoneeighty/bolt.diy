import { useEffect, useState } from 'react';
import { sessionManager } from '~/lib/services/sessionManager';
import { authService } from '~/lib/services/auth';
import { useStore } from '@nanostores/react';
import { userProfileStore, isAuthenticatedStore } from '~/lib/stores/user';

export interface SessionStatus {
  isLoading: boolean;
  isAuthenticated: boolean;
  sessionExpiry: Date | null;
  timeUntilExpiry: number | null;
  needsRefresh: boolean;
}

/**
 * Hook for managing session state and automatic restoration
 */
export function useSessionManager() {
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>({
    isLoading: true,
    isAuthenticated: false,
    sessionExpiry: null,
    timeUntilExpiry: null,
    needsRefresh: false,
  });

  const user = useStore(userProfileStore);
  const isAuthenticated = useStore(isAuthenticatedStore);

  // Initialize session on mount
  useEffect(() => {
    let mounted = true;

    const initializeSession = async () => {
      try {
        console.log('Initializing session...');

        // Try to restore session from storage
        const restored = await authService.restoreSession();

        if (mounted) {
          updateSessionStatus();
          console.log(`Session initialization complete. Restored: ${restored}`);
        }
      } catch (error) {
        console.error('Error initializing session:', error);

        if (mounted) {
          setSessionStatus((prev) => ({
            ...prev,
            isLoading: false,
            isAuthenticated: false,
          }));
        }
      }
    };

    initializeSession();

    return () => {
      mounted = false;
    };
  }, []);

  // Update session status when authentication state changes
  useEffect(() => {
    updateSessionStatus();
  }, [user, isAuthenticated]);

  // Set up periodic session status updates
  useEffect(() => {
    const interval = setInterval(() => {
      updateSessionStatus();
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const updateSessionStatus = () => {
    const expiry = sessionManager.getSessionExpiry();
    const timeUntilExpiry = sessionManager.getTimeUntilExpiry();
    const needsRefresh = sessionManager.needsRefresh();
    const authenticated = sessionManager.isAuthenticated();

    setSessionStatus({
      isLoading: false,
      isAuthenticated: authenticated,
      sessionExpiry: expiry,
      timeUntilExpiry,
      needsRefresh,
    });
  };

  const refreshSession = async () => {
    try {
      console.log('Manually refreshing session...');

      const result = await sessionManager.refreshSession();
      updateSessionStatus();

      return result;
    } catch (error) {
      console.error('Error refreshing session:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log('Logging out...');
      await authService.logout();
      updateSessionStatus();
    } catch (error) {
      console.error('Error logging out:', error);
      throw error;
    }
  };

  return {
    sessionStatus,
    refreshSession,
    logout,
    user,
    isAuthenticated,
  };
}

/**
 * Hook for session expiry warnings and automatic refresh
 */
export function useSessionExpiry() {
  const { sessionStatus, refreshSession } = useSessionManager();
  const [showExpiryWarning, setShowExpiryWarning] = useState(false);

  useEffect(() => {
    if (!sessionStatus.isAuthenticated || !sessionStatus.timeUntilExpiry) {
      setShowExpiryWarning(false);
      return;
    }

    const timeUntilExpiry = sessionStatus.timeUntilExpiry;
    const warningThreshold = 10 * 60 * 1000; // 10 minutes

    // Show warning if session expires within threshold
    if (timeUntilExpiry <= warningThreshold && timeUntilExpiry > 0) {
      setShowExpiryWarning(true);
    } else {
      setShowExpiryWarning(false);
    }

    // Auto-refresh if needed and not already refreshing
    if (sessionStatus.needsRefresh) {
      console.log('Session needs refresh, triggering automatic refresh');
      refreshSession().catch(console.error);
    }
  }, [sessionStatus, refreshSession]);

  const dismissWarning = () => {
    setShowExpiryWarning(false);
  };

  const extendSession = async () => {
    try {
      await refreshSession();
      setShowExpiryWarning(false);
    } catch (error) {
      console.error('Error extending session:', error);
      throw error;
    }
  };

  return {
    showExpiryWarning,
    timeUntilExpiry: sessionStatus.timeUntilExpiry,
    sessionExpiry: sessionStatus.sessionExpiry,
    dismissWarning,
    extendSession,
  };
}
