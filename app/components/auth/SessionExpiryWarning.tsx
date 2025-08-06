import { useSessionExpiry, useSessionManager } from '~/lib/hooks/useSessionManager';
import { ConfirmationDialog } from '~/components/ui/Dialog';

interface SessionExpiryWarningProps {
  onExtendSession?: () => void;
  onLogout?: () => void;
}

export function SessionExpiryWarning({ onExtendSession, onLogout }: SessionExpiryWarningProps) {
  const { showExpiryWarning, timeUntilExpiry, dismissWarning, extendSession } = useSessionExpiry();

  if (!showExpiryWarning || !timeUntilExpiry) {
    return null;
  }

  const minutesUntilExpiry = Math.ceil(timeUntilExpiry / (60 * 1000));

  const handleExtendSession = async () => {
    try {
      await extendSession();
      onExtendSession?.();
    } catch (error) {
      console.error('Failed to extend session:', error);

      // Could show an error message here
    }
  };

  const handleLogout = () => {
    dismissWarning();
    onLogout?.();
  };

  const handleClose = () => {
    // When user clicks "Log Out" (cancel button), we log them out
    handleLogout();
  };

  return (
    <ConfirmationDialog
      isOpen={showExpiryWarning}
      onClose={handleClose}
      onConfirm={handleExtendSession}
      title="Session Expiring Soon"
      description={`Your session will expire in ${minutesUntilExpiry} minute${minutesUntilExpiry !== 1 ? 's' : ''}. Would you like to extend your session?`}
      confirmLabel="Extend Session"
      cancelLabel="Log Out"
      variant="default"
    />
  );
}

/**
 * Session status indicator component for debugging/admin purposes
 */
export function SessionStatusIndicator() {
  const { sessionStatus } = useSessionManager();

  if (!sessionStatus.isAuthenticated) {
    return null;
  }

  const formatTime = (ms: number | null) => {
    if (!ms) {
      return 'Unknown';
    }

    const minutes = Math.floor(ms / (60 * 1000));
    const seconds = Math.floor((ms % (60 * 1000)) / 1000);

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }

    return `${seconds}s`;
  };

  return (
    <div className="fixed bottom-4 right-4 bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor rounded-lg p-3 text-xs font-mono">
      <div className="text-bolt-elements-textPrimary font-semibold mb-1">Session Status</div>
      <div className="space-y-1 text-bolt-elements-textSecondary">
        <div>Status: {sessionStatus.isAuthenticated ? 'Active' : 'Inactive'}</div>
        {sessionStatus.timeUntilExpiry && <div>Expires in: {formatTime(sessionStatus.timeUntilExpiry)}</div>}
        {sessionStatus.needsRefresh && <div className="text-yellow-500">Needs refresh</div>}
      </div>
    </div>
  );
}
