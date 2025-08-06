import { useUser, useAuth, useClerk } from '@clerk/remix';
import { useEffect } from 'react';
import { authService } from '~/lib/services/auth';
import { sessionManager } from '~/lib/services/sessionManager';
import { setUserProfile, setUserSession, clearUserData } from '~/lib/stores/user';
import type { UserProfile, UserSession } from '~/lib/services/auth';

// Check if Clerk is available
const isClerkAvailable = () => {
  try {
    // Try to access Clerk context
    return !!(typeof window !== 'undefined' && window.__clerk_publishable_key);
  } catch {
    return false;
  }
};

// Hook to sync Clerk auth state with our stores
export function useClerkSync() {
  // Fallback values when Clerk is not available
  const fallbackValues = {
    user: null,
    isSignedIn: false,
    isLoaded: true,
    signOut: () => Promise.resolve(),
    openSignIn: () => {},
    openSignUp: () => {},
    openUserProfile: () => {},
  };

  try {
    const { user, isLoaded: userLoaded } = useUser();
    const { isSignedIn, sessionId, getToken } = useAuth();
    const clerk = useClerk();

    useEffect(() => {
      if (!userLoaded) {
        return;
      }

      if (isSignedIn && user) {
        // Convert Clerk user to our UserProfile format
        const userProfile: UserProfile = {
          id: user.id,
          email: user.emailAddresses[0]?.emailAddress || '',
          username: user.username || undefined,
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
          avatar: user.imageUrl || undefined,
          createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
          updatedAt: user.updatedAt ? new Date(user.updatedAt) : new Date(),
        };

        // Update our stores
        setUserProfile(userProfile);

        // Note: authService.setUser expects a different User type, so we'll skip this for now

        // Create session if we have a sessionId
        if (sessionId) {
          getToken()
            .then((token) => {
              if (token) {
                const session: UserSession = {
                  id: sessionId,
                  userId: user.id,
                  token,
                  expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
                  createdAt: new Date(),
                };

                // Store session with session manager for persistence
                const refreshToken = `refresh_${sessionId}_${Date.now()}`;
                sessionManager.storeSession(session, userProfile, refreshToken);
              }
            })
            .catch(console.error);
        }
      } else {
        // User is not signed in, clear our stores and session
        sessionManager.logout().catch(console.error);
      }
    }, [user, isSignedIn, sessionId, userLoaded, getToken]);

    return {
      user,
      isSignedIn,
      isLoaded: userLoaded,
      signOut: () => clerk.signOut(),
      openSignIn: () => clerk.openSignIn(),
      openSignUp: () => clerk.openSignUp(),
      openUserProfile: () => clerk.openUserProfile(),
    };
  } catch (error) {
    console.warn('Clerk hooks not available, using fallback values:', error);
    return fallbackValues;
  }
}

// Hook for authentication actions
export function useAuthActions() {
  const fallbackActions = {
    signIn: () => {
      // Even without Clerk, redirect to the hosted sign-in page with return URL
      const returnUrl = encodeURIComponent(window.location.origin);
      window.location.href = `https://helpful-cicada-2.accounts.dev/sign-in?redirect_url=${returnUrl}`;
    },
    signUp: () => {
      // Even without Clerk, redirect to the hosted sign-up page with return URL
      const returnUrl = encodeURIComponent(window.location.origin);
      window.location.href = `https://helpful-cicada-2.accounts.dev/sign-up?redirect_url=${returnUrl}`;
    },
    signOut: async () => {
      await sessionManager.logout();
    },
    openProfile: () => console.warn('Profile management not available'),
    getToken: async () => null,
    refreshToken: async () => {
      try {
        const refreshResult = await sessionManager.refreshSession();
        return refreshResult.success && refreshResult.session ? refreshResult.session.token : null;
      } catch (error) {
        console.error('Error refreshing token:', error);
        return null;
      }
    },
  };

  try {
    const clerk = useClerk();
    const { getToken } = useAuth();

    return {
      signIn: () => {
        // Redirect to Clerk's hosted sign-in page with return URL
        const returnUrl = encodeURIComponent(window.location.origin);
        window.location.href = `https://helpful-cicada-2.accounts.dev/sign-in?redirect_url=${returnUrl}`;
      },
      signUp: () => {
        // Redirect to Clerk's hosted sign-up page with return URL
        const returnUrl = encodeURIComponent(window.location.origin);
        window.location.href = `https://helpful-cicada-2.accounts.dev/sign-up?redirect_url=${returnUrl}`;
      },
      signOut: async () => {
        // Use our session manager for proper cleanup
        await sessionManager.logout();
        return clerk.signOut();
      },
      openProfile: () => clerk.openUserProfile(),
      getToken,
      refreshToken: async () => {
        try {
          // Try to refresh through session manager first
          const refreshResult = await sessionManager.refreshSession();

          if (refreshResult.success && refreshResult.session) {
            return refreshResult.session.token;
          }

          // Fallback to Clerk's token refresh
          return await getToken({ template: 'default' });
        } catch (error) {
          console.error('Error refreshing token:', error);
          return null;
        }
      },
    };
  } catch (error) {
    console.warn('Clerk hooks not available, using fallback actions:', error);
    return fallbackActions;
  }
}
