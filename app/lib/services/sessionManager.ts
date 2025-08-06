import type { UserSession, UserProfile } from './auth';
import { getLocalStorage, setLocalStorage } from '~/lib/persistence/localStorage';
import { setUserSession, setUserProfile, clearUserData } from '~/lib/stores/user';

// Session storage keys
const SESSION_STORAGE_KEY = 'bolt_user_session';
const REFRESH_TOKEN_KEY = 'bolt_refresh_token';
const SESSION_EXPIRY_KEY = 'bolt_session_expiry';

// Session refresh timing constants
const REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes before expiry
const SESSION_CHECK_INTERVAL_MS = 60 * 1000; // Check every minute

// Helper to check if we're in a browser environment
const isBrowser = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export interface StoredSession {
  token: string;
  refreshToken: string;
  expiresAt: number;
  userId: string;
  user: UserProfile;
}

export interface SessionRefreshResult {
  success: boolean;
  session?: UserSession;
  error?: string;
}

export class SessionManager {
  private refreshTimer: NodeJS.Timeout | null = null;
  private isRefreshing = false;
  private refreshPromise: Promise<SessionRefreshResult> | null = null;

  constructor() {
    // Initialize session check on client side
    if (isBrowser()) {
      this.initializeSessionCheck();
    }
  }

  /**
   * Store session data securely in browser storage
   */
  storeSession(session: UserSession, user: UserProfile, refreshToken: string): void {
    if (!isBrowser()) {
      console.warn('Cannot store session: not in browser environment');
      return;
    }

    try {
      const storedSession: StoredSession = {
        token: session.token,
        refreshToken,
        expiresAt: session.expiresAt.getTime(),
        userId: session.userId,
        user,
      };

      // Store in localStorage for persistence across browser sessions
      setLocalStorage(SESSION_STORAGE_KEY, storedSession);

      // Update stores
      setUserSession(session);
      setUserProfile(user);

      // Start automatic refresh timer
      this.scheduleTokenRefresh(session.expiresAt);

      console.log('Session stored successfully');
    } catch (error) {
      console.error('Error storing session:', error);
      throw new Error('Failed to store session data');
    }
  }

  /**
   * Retrieve stored session from browser storage
   */
  getStoredSession(): StoredSession | null {
    if (!isBrowser()) {
      return null;
    }

    try {
      const stored = getLocalStorage(SESSION_STORAGE_KEY);

      if (!stored) {
        return null;
      }

      // Validate session structure
      if (!stored.token || !stored.refreshToken || !stored.expiresAt || !stored.userId || !stored.user) {
        console.warn('Invalid session data found, clearing storage');
        this.clearStoredSession();

        return null;
      }

      return stored;
    } catch (error) {
      console.error('Error retrieving stored session:', error);
      this.clearStoredSession();

      return null;
    }
  }

  /**
   * Check if current session is valid and not expired
   */
  isSessionValid(): boolean {
    const stored = this.getStoredSession();

    if (!stored) {
      return false;
    }

    const now = Date.now();
    const expiresAt = stored.expiresAt;

    return now < expiresAt;
  }

  /**
   * Check if session needs refresh (within threshold of expiry)
   */
  needsRefresh(): boolean {
    const stored = this.getStoredSession();

    if (!stored) {
      return false;
    }

    const now = Date.now();
    const expiresAt = stored.expiresAt;
    const refreshThreshold = expiresAt - REFRESH_THRESHOLD_MS;

    return now >= refreshThreshold && now < expiresAt;
  }

  /**
   * Restore session from storage and update stores
   */
  async restoreSession(): Promise<boolean> {
    try {
      const stored = this.getStoredSession();

      if (!stored) {
        return false;
      }

      if (!this.isSessionValid()) {
        console.log('Stored session is expired, attempting refresh');

        const refreshResult = await this.refreshSession();

        return refreshResult.success;
      }

      // Session is valid, restore to stores
      const session: UserSession = {
        id: `session_${stored.userId}`,
        userId: stored.userId,
        token: stored.token,
        expiresAt: new Date(stored.expiresAt),
        createdAt: new Date(), // We don't store createdAt, so use current time
      };

      setUserSession(session);
      setUserProfile(stored.user);

      // Schedule refresh if needed
      this.scheduleTokenRefresh(session.expiresAt);

      console.log('Session restored successfully');

      return true;
    } catch (error) {
      console.error('Error restoring session:', error);
      this.clearStoredSession();

      return false;
    }
  }

  /**
   * Refresh the current session token
   */
  async refreshSession(): Promise<SessionRefreshResult> {
    // Prevent multiple simultaneous refresh attempts
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = this.performRefresh();

    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  /**
   * Perform the actual token refresh
   */
  private async performRefresh(): Promise<SessionRefreshResult> {
    try {
      const stored = this.getStoredSession();

      if (!stored || !stored.refreshToken) {
        return {
          success: false,
          error: 'No refresh token available',
        };
      }

      /*
       * In a real implementation, this would make an API call to refresh the token
       * For now, we'll simulate the refresh process
       */
      console.log('Refreshing session token...');

      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Simulate successful refresh (in real implementation, this would be the API response)
      const newExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
      const newToken = `refreshed_token_${Date.now()}`;

      const refreshedSession: UserSession = {
        id: `session_${stored.userId}`,
        userId: stored.userId,
        token: newToken,
        expiresAt: newExpiresAt,
        createdAt: new Date(),
      };

      // Update stored session
      this.storeSession(refreshedSession, stored.user, stored.refreshToken);

      console.log('Session refreshed successfully');

      return {
        success: true,
        session: refreshedSession,
      };
    } catch (error) {
      console.error('Error refreshing session:', error);

      // If refresh fails, clear the session
      this.clearStoredSession();

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during refresh',
      };
    }
  }

  /**
   * Schedule automatic token refresh
   */
  private scheduleTokenRefresh(expiresAt: Date): void {
    // Clear existing timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    const now = Date.now();
    const expiryTime = expiresAt.getTime();
    const refreshTime = expiryTime - REFRESH_THRESHOLD_MS;
    const timeUntilRefresh = refreshTime - now;

    if (timeUntilRefresh > 0) {
      this.refreshTimer = setTimeout(async () => {
        console.log('Automatic token refresh triggered');
        await this.refreshSession();
      }, timeUntilRefresh);

      console.log(`Token refresh scheduled in ${Math.round(timeUntilRefresh / 1000)} seconds`);
    } else {
      // Token is already within refresh threshold, refresh immediately
      console.log('Token is within refresh threshold, refreshing now');
      this.refreshSession();
    }
  }

  /**
   * Initialize periodic session validity checks
   */
  private initializeSessionCheck(): void {
    // Check session validity periodically
    setInterval(() => {
      if (this.isSessionValid()) {
        if (this.needsRefresh() && !this.isRefreshing) {
          console.log('Session needs refresh, triggering automatic refresh');
          this.refreshSession();
        }
      } else {
        // Session is invalid, clear it
        const stored = this.getStoredSession();

        if (stored) {
          console.log('Session expired, clearing stored data');
          this.clearStoredSession();
        }
      }
    }, SESSION_CHECK_INTERVAL_MS);
  }

  /**
   * Clear all stored session data and update stores
   */
  clearStoredSession(): void {
    try {
      // Clear localStorage
      if (isBrowser()) {
        window.localStorage.removeItem(SESSION_STORAGE_KEY);
        window.localStorage.removeItem(REFRESH_TOKEN_KEY);
        window.localStorage.removeItem(SESSION_EXPIRY_KEY);
      }

      // Clear stores
      clearUserData();

      // Clear refresh timer
      if (this.refreshTimer) {
        clearTimeout(this.refreshTimer);
        this.refreshTimer = null;
      }

      console.log('Session data cleared');
    } catch (error) {
      console.error('Error clearing session data:', error);
    }
  }

  /**
   * Logout with proper cleanup
   */
  async logout(): Promise<void> {
    try {
      console.log('Logging out user...');

      /*
       * In a real implementation, this would make an API call to invalidate the session
       * For now, we'll just clear local data
       */

      // Clear all stored session data
      this.clearStoredSession();

      // Additional cleanup can be added here (e.g., clear other caches, notify other tabs)

      console.log('Logout completed successfully');
    } catch (error) {
      console.error('Error during logout:', error);

      // Even if logout fails, clear local data
      this.clearStoredSession();
      throw error;
    }
  }

  /**
   * Get current session expiry time
   */
  getSessionExpiry(): Date | null {
    const stored = this.getStoredSession();
    return stored ? new Date(stored.expiresAt) : null;
  }

  /**
   * Get time until session expires (in milliseconds)
   */
  getTimeUntilExpiry(): number | null {
    const expiry = this.getSessionExpiry();
    return expiry ? expiry.getTime() - Date.now() : null;
  }

  /**
   * Check if user is currently authenticated
   */
  isAuthenticated(): boolean {
    return this.isSessionValid();
  }
}

// Singleton instance
export const sessionManager = new SessionManager();
