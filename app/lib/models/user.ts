// User data model with validation
export interface User {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;

  // Additional fields for chat functionality
  preferences?: UserPreferences;
  subscription?: UserSubscription;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  emailNotifications: boolean;
  chatHistory: boolean;
  defaultModel?: string;
  defaultProvider?: string;
}

export interface UserSubscription {
  plan: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'inactive' | 'cancelled' | 'past_due';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

// User session data model
export interface UserSession {
  id: string;
  userId: string;
  token: string;
  refreshToken?: string;
  expiresAt: Date;
  createdAt: Date;
  lastAccessedAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

// User validation functions
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateUsername = (username: string): boolean => {
  // Username should be 3-30 characters, alphanumeric and underscores only
  const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
  return usernameRegex.test(username);
};

export const validateUserData = (userData: Partial<User>): string[] => {
  const errors: string[] = [];

  if (userData.email && !validateEmail(userData.email)) {
    errors.push('Invalid email format');
  }

  if (userData.username && !validateUsername(userData.username)) {
    errors.push('Username must be 3-30 characters and contain only letters, numbers, and underscores');
  }

  if (userData.firstName && userData.firstName.length > 50) {
    errors.push('First name must be less than 50 characters');
  }

  if (userData.lastName && userData.lastName.length > 50) {
    errors.push('Last name must be less than 50 characters');
  }

  return errors;
};

// User factory functions
export const createUser = (data: {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
}): User => {
  const now = new Date();

  return {
    id: data.id,
    email: data.email,
    username: data.username,
    firstName: data.firstName,
    lastName: data.lastName,
    avatar: data.avatar,
    createdAt: now,
    updatedAt: now,
    preferences: {
      theme: 'system',
      language: 'en',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      emailNotifications: true,
      chatHistory: true,
    },
    subscription: {
      plan: 'free',
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days
      cancelAtPeriodEnd: false,
    },
  };
};

export const createUserSession = (data: {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  refreshToken?: string;
  ipAddress?: string;
  userAgent?: string;
}): UserSession => {
  const now = new Date();

  return {
    id: data.id,
    userId: data.userId,
    token: data.token,
    refreshToken: data.refreshToken,
    expiresAt: data.expiresAt,
    createdAt: now,
    lastAccessedAt: now,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
  };
};

// User utility functions
export const getUserDisplayName = (user: User): string => {
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }

  if (user.firstName) {
    return user.firstName;
  }

  if (user.username) {
    return user.username;
  }

  return user.email.split('@')[0] || 'User';
};

export const getUserInitials = (user: User): string => {
  if (user.firstName && user.lastName) {
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  }

  if (user.firstName) {
    return user.firstName[0].toUpperCase();
  }

  if (user.username) {
    return user.username[0].toUpperCase();
  }

  return user.email[0].toUpperCase();
};

export const isSessionValid = (session: UserSession): boolean => {
  return new Date() < session.expiresAt;
};

export const isSessionExpiringSoon = (session: UserSession, minutesThreshold: number = 15): boolean => {
  const now = new Date();
  const thresholdTime = new Date(now.getTime() + minutesThreshold * 60 * 1000);

  return session.expiresAt <= thresholdTime;
};
