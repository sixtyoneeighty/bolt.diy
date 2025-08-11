import { sessionManager } from './sessionManager';

export interface UserProfile {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSession {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface AuthService {
  // User management
  getCurrentUser(): Promise<UserProfile | null>;
  getUserById(id: string): Promise<UserProfile | null>;
  updateUserProfile(id: string, updates: Partial<UserProfile>): Promise<UserProfile>;

  // Session management
  getCurrentSession(): Promise<UserSession | null>;
  refreshSession(): Promise<UserSession | null>;
  signOut(): Promise<void>;

  // Authentication state
  isAuthenticated(): Promise<boolean>;
  onAuthStateChange(callback: (user: UserProfile | null) => void): () => void;

  // Session persistence
  restoreSession(): Promise<boolean>;
  logout(): Promise<void>;
}

export class DefaultAuthService implements AuthService {
  private _user: UserProfile | null = null;
  private _session: UserSession | null = null;
  private _authStateCallbacks: ((user: UserProfile | null) => void)[] = [];

  async getCurrentUser(): Promise<UserProfile | null> {
    try {
      /*
       * In a real implementation, this would use authentication service hooks
       * For now, return cached user or null
       */
      return this._user;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  async getUserById(_id: string): Promise<UserProfile | null> {
    try {
      /*
       * This would make an API call to get user by ID
       * For now, return null as placeholder
       */
      return null;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
  }

  async updateUserProfile(id: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    try {
      /*
       * This would make an API call to update user profile
       * For now, merge updates with current user
       */
      if (this._user && this._user.id === id) {
        this._user = { ...this._user, ...updates, updatedAt: new Date() };
        this._notifyAuthStateChange(this._user);

        return this._user;
      }

      throw new Error('User not found or not authenticated');
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  async getCurrentSession(): Promise<UserSession | null> {
    try {
      // Check if we have a valid session in memory
      if (this._session && sessionManager.isSessionValid()) {
        return this._session;
      }

      // Try to restore from storage
      const restored = await this.restoreSession();

      if (restored) {
        return this._session;
      }

      return null;
    } catch (error) {
      console.error('Error getting current session:', error);
      return null;
    }
  }

  async refreshSession(): Promise<UserSession | null> {
    try {
      const refreshResult = await sessionManager.refreshSession();

      if (refreshResult.success && refreshResult.session) {
        this._session = refreshResult.session;
        return refreshResult.session;
      }

      return null;
    } catch (error) {
      console.error('Error refreshing session:', error);
      return null;
    }
  }

  async signOut(): Promise<void> {
    try {
      // Use the session manager's logout functionality
      await this.logout();
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      // Use session manager for authentication check
      return sessionManager.isAuthenticated();
    } catch (error) {
      console.error('Error checking authentication status:', error);
      return false;
    }
  }

  async restoreSession(): Promise<boolean> {
    try {
      const restored = await sessionManager.restoreSession();

      if (restored) {
        // Update local user and session from restored data
        const storedSession = sessionManager.getStoredSession();

        if (storedSession) {
          this._user = storedSession.user;
          this._session = {
            id: `session_${storedSession.userId}`,
            userId: storedSession.userId,
            token: storedSession.token,
            expiresAt: new Date(storedSession.expiresAt),
            createdAt: new Date(),
          };
          this._notifyAuthStateChange(this._user);
        }
      }

      return restored;
    } catch (error) {
      console.error('Error restoring session:', error);
      return false;
    }
  }

  async logout(): Promise<void> {
    try {
      // Use session manager's logout functionality
      await sessionManager.logout();

      // Clear local state
      this._user = null;
      this._session = null;

      // Notify auth state change
      this._notifyAuthStateChange(null);
    } catch (error) {
      console.error('Error during logout:', error);
      throw error;
    }
  }

  onAuthStateChange(callback: (user: UserProfile | null) => void): () => void {
    this._authStateCallbacks.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this._authStateCallbacks.indexOf(callback);

      if (index > -1) {
        this._authStateCallbacks.splice(index, 1);
      }
    };
  }

  private _notifyAuthStateChange(user: UserProfile | null): void {
    this._authStateCallbacks.forEach((callback) => {
      try {
        callback(user);
      } catch (error) {
        console.error('Error in auth state change callback:', error);
      }
    });
  }

  // Helper method to set user
  setUser(user: UserProfile | null): void {
    this._user = user;
    this._notifyAuthStateChange(this._user);
  }
}

// Singleton instance
export const authService = new DefaultAuthService();
