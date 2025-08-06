import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SessionManager } from '~/lib/services/sessionManager';
import type { UserSession, UserProfile } from '~/lib/services/auth';

// Mock the stores
vi.mock('../../stores/user', () => ({
  setUserSession: vi.fn(),
  setUserProfile: vi.fn(),
  clearUserData: vi.fn(),
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

// Mock window object
Object.defineProperty(global, 'window', {
  value: {
    localStorage: localStorageMock,
  },
  writable: true,
});

// Mock the localStorage utility functions
vi.mock('../../persistence/localStorage', () => ({
  getLocalStorage: vi.fn((key: string) => {
    const item = localStorageMock.getItem(key);
    return item ? JSON.parse(item) : null;
  }),
  setLocalStorage: vi.fn((key: string, value: any) => {
    localStorageMock.setItem(key, JSON.stringify(value));
  }),
}));

// Mock console methods
const consoleMock = {
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
};

Object.defineProperty(console, 'log', { value: consoleMock.log });
Object.defineProperty(console, 'error', { value: consoleMock.error });
Object.defineProperty(console, 'warn', { value: consoleMock.warn });

describe('SessionManager', () => {
  let sessionManager: SessionManager;
  let mockUser: UserProfile;
  let mockSession: UserSession;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);

    sessionManager = new SessionManager();

    mockUser = {
      id: 'user123',
      email: 'test@example.com',
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      avatar: 'https://example.com/avatar.jpg',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };

    mockSession = {
      id: 'session123',
      userId: 'user123',
      token: 'test-token',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      createdAt: new Date(),
    };
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('storeSession', () => {
    it('should store session data in localStorage', () => {
      const refreshToken = 'refresh-token';

      sessionManager.storeSession(mockSession, mockUser, refreshToken);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'bolt_user_session',
        expect.stringContaining('"token":"test-token"'),
      );
    });

    it('should handle storage errors gracefully', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      expect(() => {
        sessionManager.storeSession(mockSession, mockUser, 'refresh-token');
      }).toThrow('Failed to store session data');
    });
  });

  describe('getStoredSession', () => {
    it('should retrieve valid session from localStorage', () => {
      const storedData = {
        token: 'test-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() + 60 * 60 * 1000,
        userId: 'user123',
        user: {
          ...mockUser,
          createdAt: mockUser.createdAt.toISOString(),
          updatedAt: mockUser.updatedAt.toISOString(),
        },
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedData));

      const result = sessionManager.getStoredSession();

      expect(result).toEqual(storedData);
    });

    it('should return null for invalid session data', () => {
      localStorageMock.getItem.mockReturnValue(
        JSON.stringify({
          token: 'test-token',

          // Missing required fields
        }),
      );

      const result = sessionManager.getStoredSession();

      expect(result).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('bolt_user_session');
    });

    it('should handle JSON parse errors', () => {
      localStorageMock.getItem.mockReturnValue('invalid-json');

      const result = sessionManager.getStoredSession();

      expect(result).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('bolt_user_session');
    });
  });

  describe('isSessionValid', () => {
    it('should return true for valid non-expired session', () => {
      const storedData = {
        token: 'test-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour from now
        userId: 'user123',
        user: {
          ...mockUser,
          createdAt: mockUser.createdAt.toISOString(),
          updatedAt: mockUser.updatedAt.toISOString(),
        },
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedData));

      expect(sessionManager.isSessionValid()).toBe(true);
    });

    it('should return false for expired session', () => {
      const storedData = {
        token: 'test-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() - 60 * 60 * 1000, // 1 hour ago
        userId: 'user123',
        user: {
          ...mockUser,
          createdAt: mockUser.createdAt.toISOString(),
          updatedAt: mockUser.updatedAt.toISOString(),
        },
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedData));

      expect(sessionManager.isSessionValid()).toBe(false);
    });

    it('should return false when no session exists', () => {
      localStorageMock.getItem.mockReturnValue(null);

      expect(sessionManager.isSessionValid()).toBe(false);
    });
  });

  describe('needsRefresh', () => {
    it('should return true when session is within refresh threshold', () => {
      const storedData = {
        token: 'test-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() + 2 * 60 * 1000, // 2 minutes from now (within 5 minute threshold)
        userId: 'user123',
        user: {
          ...mockUser,
          createdAt: mockUser.createdAt.toISOString(),
          updatedAt: mockUser.updatedAt.toISOString(),
        },
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedData));

      expect(sessionManager.needsRefresh()).toBe(true);
    });

    it('should return false when session has plenty of time left', () => {
      const storedData = {
        token: 'test-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() + 30 * 60 * 1000, // 30 minutes from now
        userId: 'user123',
        user: {
          ...mockUser,
          createdAt: mockUser.createdAt.toISOString(),
          updatedAt: mockUser.updatedAt.toISOString(),
        },
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedData));

      expect(sessionManager.needsRefresh()).toBe(false);
    });
  });

  describe('refreshSession', () => {
    it('should refresh session successfully', async () => {
      const storedData = {
        token: 'old-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() + 2 * 60 * 1000,
        userId: 'user123',
        user: {
          ...mockUser,
          createdAt: mockUser.createdAt.toISOString(),
          updatedAt: mockUser.updatedAt.toISOString(),
        },
      };

      // Mock getItem to return the stored data consistently
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'bolt_user_session') {
          return JSON.stringify(storedData);
        }

        return null;
      });

      const result = await sessionManager.refreshSession();

      expect(result.success).toBe(true);
      expect(result.session).toBeDefined();
      expect(result.session?.token).toMatch(/^refreshed_token_/);
    });

    it('should handle refresh failure when no refresh token exists', async () => {
      localStorageMock.getItem.mockReturnValue(null);

      const result = await sessionManager.refreshSession();

      expect(result.success).toBe(false);
      expect(result.error).toBe('No refresh token available');
    });

    it('should prevent multiple simultaneous refresh attempts', async () => {
      const storedData = {
        token: 'old-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() + 2 * 60 * 1000,
        userId: 'user123',
        user: {
          ...mockUser,
          createdAt: mockUser.createdAt.toISOString(),
          updatedAt: mockUser.updatedAt.toISOString(),
        },
      };

      // Mock getItem to return the stored data consistently
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'bolt_user_session') {
          return JSON.stringify(storedData);
        }

        return null;
      });

      // Start two refresh attempts simultaneously
      const promise1 = sessionManager.refreshSession();
      const promise2 = sessionManager.refreshSession();

      const [result1, result2] = await Promise.all([promise1, promise2]);

      // Both should succeed and return the same result
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.session?.token).toBe(result2.session?.token);
    });
  });

  describe('clearStoredSession', () => {
    it('should clear all session data from localStorage', () => {
      sessionManager.clearStoredSession();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('bolt_user_session');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('bolt_refresh_token');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('bolt_session_expiry');
    });
  });

  describe('logout', () => {
    it('should clear session data on logout', async () => {
      await sessionManager.logout();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('bolt_user_session');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('bolt_refresh_token');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('bolt_session_expiry');
    });
  });

  describe('getSessionExpiry', () => {
    it('should return session expiry date', () => {
      const expiryTime = Date.now() + 60 * 60 * 1000;
      const storedData = {
        token: 'test-token',
        refreshToken: 'refresh-token',
        expiresAt: expiryTime,
        userId: 'user123',
        user: {
          ...mockUser,
          createdAt: mockUser.createdAt.toISOString(),
          updatedAt: mockUser.updatedAt.toISOString(),
        },
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedData));

      const expiry = sessionManager.getSessionExpiry();

      expect(expiry).toEqual(new Date(expiryTime));
    });

    it('should return null when no session exists', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const expiry = sessionManager.getSessionExpiry();

      expect(expiry).toBeNull();
    });
  });

  describe('getTimeUntilExpiry', () => {
    it('should return time until expiry in milliseconds', () => {
      const expiryTime = Date.now() + 30 * 60 * 1000; // 30 minutes
      const storedData = {
        token: 'test-token',
        refreshToken: 'refresh-token',
        expiresAt: expiryTime,
        userId: 'user123',
        user: {
          ...mockUser,
          createdAt: mockUser.createdAt.toISOString(),
          updatedAt: mockUser.updatedAt.toISOString(),
        },
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedData));

      const timeUntilExpiry = sessionManager.getTimeUntilExpiry();

      expect(timeUntilExpiry).toBeGreaterThan(29 * 60 * 1000); // Should be close to 30 minutes
      expect(timeUntilExpiry).toBeLessThan(31 * 60 * 1000);
    });
  });

  describe('isAuthenticated', () => {
    it('should return true for valid session', () => {
      const storedData = {
        token: 'test-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() + 60 * 60 * 1000,
        userId: 'user123',
        user: {
          ...mockUser,
          createdAt: mockUser.createdAt.toISOString(),
          updatedAt: mockUser.updatedAt.toISOString(),
        },
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedData));

      expect(sessionManager.isAuthenticated()).toBe(true);
    });

    it('should return false for expired session', () => {
      const storedData = {
        token: 'test-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() - 60 * 60 * 1000, // Expired
        userId: 'user123',
        user: {
          ...mockUser,
          createdAt: mockUser.createdAt.toISOString(),
          updatedAt: mockUser.updatedAt.toISOString(),
        },
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedData));

      expect(sessionManager.isAuthenticated()).toBe(false);
    });
  });
});
