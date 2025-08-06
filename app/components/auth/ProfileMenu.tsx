import { useState, useRef, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { motion, AnimatePresence } from 'framer-motion';
import { userProfileStore, userDisplayNameStore, userInitialsStore } from '~/lib/stores/user';
import { useClerkSync, useAuthActions } from '~/lib/auth/clerk.client';
import { classNames } from '~/utils/classNames';

interface ProfileMenuProps {
  className?: string;
}

export const ProfileMenu = ({ className }: ProfileMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const user = useStore(userProfileStore);
  const displayName = useStore(userDisplayNameStore);
  const initials = useStore(userInitialsStore);

  const { isSignedIn, isLoaded } = useClerkSync();
  const { signIn, signUp, signOut, openProfile } = useAuthActions();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }

    return undefined;
  }, [isOpen]);

  if (!isLoaded) {
    return (
      <div className={classNames('flex items-center gap-3', className)}>
        <div className="w-8 h-8 bg-bolt-elements-background-depth-3 rounded-full animate-pulse" />
        <div className="w-20 h-4 bg-bolt-elements-background-depth-3 rounded animate-pulse" />
      </div>
    );
  }

  if (!isSignedIn || !user) {
    return (
      <div className={classNames('flex items-center gap-2', className)}>
        <button
          onClick={signIn}
          className="px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
        >
          Sign in
        </button>
        <button
          onClick={signUp}
          className="px-3 py-1.5 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
        >
          Sign up
        </button>
      </div>
    );
  }

  return (
    <div className={classNames('relative', className)}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={classNames(
          'flex items-center gap-3 p-2 rounded-lg transition-colors',
          'hover:bg-bolt-elements-background-depth-3',
          'focus:outline-none focus:ring-2 focus:ring-red-500/20',
          isOpen ? 'bg-bolt-elements-background-depth-3' : undefined,
        )}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <div className="flex items-center justify-center w-8 h-8 overflow-hidden bg-bolt-elements-background-depth-2 text-bolt-elements-textSecondary rounded-full shrink-0">
          {user.avatar ? (
            <img src={user.avatar} alt={displayName} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <span className="text-sm font-medium">{initials}</span>
          )}
        </div>

        <div className="flex-1 text-left min-w-0">
          <p className="text-sm font-medium text-bolt-elements-textPrimary truncate">{displayName}</p>
          <p className="text-xs text-bolt-elements-textSecondary truncate">{user.email}</p>
        </div>

        <div
          className={classNames(
            'i-ph:caret-down text-sm text-bolt-elements-textTertiary transition-transform',
            isOpen ? 'rotate-180' : undefined,
          )}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-2 py-2 bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor rounded-lg shadow-lg z-50"
            role="menu"
          >
            <div className="px-3 py-2 border-b border-bolt-elements-borderColor">
              <p className="text-sm font-medium text-bolt-elements-textPrimary">{displayName}</p>
              <p className="text-xs text-bolt-elements-textSecondary">{user.email}</p>
            </div>

            <div className="py-1">
              <button
                onClick={() => {
                  openProfile();
                  setIsOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-sm text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-3 flex items-center gap-2"
                role="menuitem"
              >
                <div className="i-ph:user text-sm" />
                Profile Settings
              </button>

              <button
                onClick={() => {
                  // TODO: Open preferences/settings
                  setIsOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-sm text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-3 flex items-center gap-2"
                role="menuitem"
              >
                <div className="i-ph:gear text-sm" />
                Preferences
              </button>

              <button
                onClick={() => {
                  // TODO: Open billing/subscription
                  setIsOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-sm text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-3 flex items-center gap-2"
                role="menuitem"
              >
                <div className="i-ph:credit-card text-sm" />
                Billing
              </button>
            </div>

            <div className="border-t border-bolt-elements-borderColor py-1">
              <button
                onClick={() => {
                  signOut();
                  setIsOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                role="menuitem"
              >
                <div className="i-ph:sign-out text-sm" />
                Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Compact version for smaller spaces
export const CompactProfileMenu = ({ className }: ProfileMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const user = useStore(userProfileStore);
  const initials = useStore(userInitialsStore);

  const { isSignedIn, isLoaded } = useClerkSync();
  const { signIn, signOut, openProfile } = useAuthActions();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isLoaded) {
    return (
      <div
        className={classNames('w-8 h-8 bg-bolt-elements-background-depth-3 rounded-full animate-pulse', className)}
      />
    );
  }

  if (!isSignedIn || !user) {
    return (
      <button
        onClick={signIn}
        className={classNames(
          'w-8 h-8 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-red-500/20',
          className,
        )}
        title="Sign in"
      >
        <div className="i-ph:user text-sm" />
      </button>
    );
  }

  return (
    <div className={classNames('relative', className)}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={classNames(
          'w-8 h-8 overflow-hidden bg-bolt-elements-background-depth-2 rounded-full transition-colors',
          'hover:ring-2 hover:ring-red-500/20',
          'focus:outline-none focus:ring-2 focus:ring-red-500/20',
        )}
        title={`${user.firstName || user.username || 'User'} - Click for menu`}
      >
        {user.avatar ? (
          <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <span className="text-sm font-medium text-bolt-elements-textPrimary">{initials}</span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full right-0 mt-2 w-48 py-2 bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor rounded-lg shadow-lg z-50"
            role="menu"
          >
            <div className="px-3 py-2 border-b border-bolt-elements-borderColor">
              <p className="text-sm font-medium text-bolt-elements-textPrimary truncate">
                {user.firstName || user.username || 'User'}
              </p>
              <p className="text-xs text-bolt-elements-textSecondary truncate">{user.email}</p>
            </div>

            <div className="py-1">
              <button
                onClick={() => {
                  openProfile();
                  setIsOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-sm text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-3 flex items-center gap-2"
                role="menuitem"
              >
                <div className="i-ph:user text-sm" />
                Profile
              </button>

              <button
                onClick={() => {
                  signOut();
                  setIsOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                role="menuitem"
              >
                <div className="i-ph:sign-out text-sm" />
                Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
