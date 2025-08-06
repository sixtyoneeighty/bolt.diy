// Authentication components
export { LoginForm, CustomLoginForm } from './LoginForm';
export { RegisterForm, CustomRegisterForm } from './RegisterForm';
export { ProfileMenu, CompactProfileMenu } from './ProfileMenu';
export { AuthGuard, withAuthGuard, useAuthGuard, ProtectedSection } from './AuthGuard';
export { SessionExpiryWarning, SessionStatusIndicator } from './SessionExpiryWarning';
export { SessionInitializer, withSessionInitializer } from './SessionInitializer';

// Re-export auth utilities
export { useClerkSync, useAuthActions } from '~/lib/auth/clerk.client';
export { authService } from '~/lib/services/auth';
export { sessionManager } from '~/lib/services/sessionManager';
export { useSessionManager, useSessionExpiry } from '~/lib/hooks/useSessionManager';
export {
  userProfileStore,
  userSessionStore,
  isAuthenticatedStore,
  userDisplayNameStore,
  userInitialsStore,
  setUserProfile,
  setUserSession,
  updateUserProfile,
  clearUserData,
} from '~/lib/stores/user';

// Types
export type { UserProfile, UserSession, AuthService } from '~/lib/services/auth';
export type { User, UserPreferences, UserSubscription } from '~/lib/models/user';
