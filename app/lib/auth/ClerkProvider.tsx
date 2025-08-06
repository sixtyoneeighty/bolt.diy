import { ClerkProvider } from '@clerk/clerk-react';
import { dark } from '@clerk/themes';
import type { ReactNode } from 'react';
import { useStore } from '@nanostores/react';
import { themeStore } from '~/lib/stores/theme';
import React from 'react';

// Clerk appearance configuration with brand colors
const getClerkAppearance = (theme: 'light' | 'dark') => ({
  baseTheme: theme === 'dark' ? dark : undefined,
  variables: {
    // Brand colors
    colorPrimary: '#DC2626', // Brand red
    colorBackground: theme === 'light' ? '#FDF9F1' : '#000000', // Cream light / Black
    colorInputBackground: theme === 'light' ? '#FAF2E3' : '#0A0A0A', // Cream / Dark gray
    colorInputText: theme === 'light' ? '#000000' : '#FDF9F1', // Black / Cream
    colorText: theme === 'light' ? '#000000' : '#FDF9F1', // Black / Cream
    colorTextSecondary: theme === 'light' ? '#6B5529' : '#EFDBAA', // Cream dark / Cream light
    colorSuccess: '#22C55E', // Keep green for success
    colorDanger: '#DC2626', // Brand red for errors
    colorWarning: '#F79009', // Keep orange for warnings

    // Border and surface colors
    colorNeutral: theme === 'light' ? '#E8CC85' : '#8F7238', // Cream / Cream dark
    borderRadius: '0.5rem',

    // Font
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    fontSize: '14px',
  },
  elements: {
    // Card styling
    card: {
      backgroundColor: theme === 'light' ? '#FDF9F1' : '#000000',
      border: `1px solid ${theme === 'light' ? '#E8CC85' : '#8F7238'}`,
      borderRadius: '0.5rem',
      boxShadow:
        theme === 'light'
          ? '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
          : '0 1px 3px 0 rgba(255, 255, 255, 0.1), 0 1px 2px 0 rgba(255, 255, 255, 0.06)',
    },

    // Header styling
    headerTitle: {
      color: theme === 'light' ? '#000000' : '#FDF9F1',
      fontSize: '1.5rem',
      fontWeight: '600',
    },

    headerSubtitle: {
      color: theme === 'light' ? '#6B5529' : '#EFDBAA',
      fontSize: '0.875rem',
    },

    // Form elements
    formButtonPrimary: {
      backgroundColor: '#DC2626',
      color: '#FFFFFF',
      '&:hover': {
        backgroundColor: '#B91C1C',
      },
      '&:focus': {
        backgroundColor: '#B91C1C',
        boxShadow: '0 0 0 2px rgba(220, 38, 38, 0.2)',
      },
    },

    formFieldInput: {
      backgroundColor: theme === 'light' ? '#FAF2E3' : '#0A0A0A',
      borderColor: theme === 'light' ? '#E8CC85' : '#8F7238',
      color: theme === 'light' ? '#000000' : '#FDF9F1',
      '&:focus': {
        borderColor: '#DC2626',
        boxShadow: '0 0 0 2px rgba(220, 38, 38, 0.2)',
      },
    },

    // Links
    footerActionLink: {
      color: '#DC2626',
      '&:hover': {
        color: '#B91C1C',
      },
    },

    // Social buttons
    socialButtonsBlockButton: {
      backgroundColor: theme === 'light' ? '#FAF2E3' : '#0A0A0A',
      borderColor: theme === 'light' ? '#E8CC85' : '#8F7238',
      color: theme === 'light' ? '#000000' : '#FDF9F1',
      '&:hover': {
        backgroundColor: theme === 'light' ? '#F5E8CC' : '#171717',
      },
    },
  },
});

// Clerk configuration hook
export function useClerkConfig() {
  const theme = useStore(themeStore);

  return {
    appearance: getClerkAppearance(theme),
    signInUrl: 'https://helpful-cicada-2.accounts.dev/sign-in',
    signUpUrl: 'https://helpful-cicada-2.accounts.dev/sign-up',
    afterSignInUrl: typeof window !== 'undefined' ? window.location.origin : '/',
    afterSignUpUrl: typeof window !== 'undefined' ? window.location.origin : '/',
  };
}

interface FallbackProviderProps {
  children: ReactNode;
}

function FallbackProvider({ children }: FallbackProviderProps) {
  return <>{children}</>;
}

interface ConditionalClerkAppProps {
  children: ReactNode;
}

function ConditionalClerkApp({ children }: ConditionalClerkAppProps) {
  const theme = useStore(themeStore);
  const publishableKey =
    typeof window !== 'undefined'
      ? (window as any).ENV?.CLERK_PUBLISHABLE_KEY || import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
      : process.env.CLERK_PUBLISHABLE_KEY;

  const isClerkConfigured = Boolean(publishableKey);

  // On server-side, always use FallbackProvider to avoid SSR issues
  if (typeof window === 'undefined') {
    return <FallbackProvider>{children}</FallbackProvider>;
  }

  // On client-side, use ClerkProvider if configured
  if (isClerkConfigured) {
    return (
      <ClerkProvider
        publishableKey={publishableKey}
        appearance={getClerkAppearance(theme)}
        signInUrl="https://helpful-cicada-2.accounts.dev/sign-in"
        signUpUrl="https://helpful-cicada-2.accounts.dev/sign-up"
        afterSignInUrl={window.location.origin}
        afterSignUpUrl={window.location.origin}
      >
        {children}
      </ClerkProvider>
    );
  }

  return <FallbackProvider>{children}</FallbackProvider>;
}

export { ConditionalClerkApp as ClerkApp };
