import { atom, computed } from 'nanostores';
import type { UserProfile, UserSession } from '~/lib/services/auth';

// User profile store
export const userProfileStore = atom<UserProfile | null>(null);

// User session store
export const userSessionStore = atom<UserSession | null>(null);

// Authentication state store
export const isAuthenticatedStore = computed(userProfileStore, (user) => user !== null);

// User display name computed store
export const userDisplayNameStore = computed(userProfileStore, (user) => {
  if (!user) {
    return 'Guest';
  }

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
});

// User initials computed store (for avatar fallback)
export const userInitialsStore = computed(userProfileStore, (user) => {
  if (!user) {
    return 'G';
  }

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
});

// Actions to update stores
export const setUserProfile = (user: UserProfile | null) => {
  userProfileStore.set(user);
};

export const setUserSession = (session: UserSession | null) => {
  userSessionStore.set(session);
};

export const updateUserProfile = (updates: Partial<UserProfile>) => {
  const currentUser = userProfileStore.get();

  if (currentUser) {
    userProfileStore.set({
      ...currentUser,
      ...updates,
      updatedAt: new Date(),
    });
  }
};

export const clearUserData = () => {
  userProfileStore.set(null);
  userSessionStore.set(null);
};
