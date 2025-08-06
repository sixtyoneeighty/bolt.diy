import { ClerkApp as OriginalClerkApp } from '@clerk/remix';
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
  const isClerkConfigured = Boolean(
    typeof window !== 'undefined'
      ? (window as any).ENV?.CLERK_PUBLISHABLE_KEY || import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
      : process.env.CLERK_PUBLISHABLE_KEY,
  );

  if (isClerkConfigured) {
    // Use ClerkApp as a higher-order component
    const WrappedComponent = () => <>{children}</>;
    const ClerkWrappedComponent = OriginalClerkApp(WrappedComponent, {
      appearance: {
        baseTheme: dark,
        variables: {
          colorPrimary: '#3b82f6',
          colorBackground: '#0f172a',
          colorInputBackground: '#1e293b',
          colorInputText: '#f1f5f9',
          colorText: '#f1f5f9',
          colorTextSecondary: '#94a3b8',
          colorNeutral: '#64748b',
          colorDanger: '#ef4444',
          colorSuccess: '#10b981',
          colorWarning: '#f59e0b',
          borderRadius: '0.5rem',
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: '0.875rem',
          fontWeight: {
            normal: '400',
            medium: '500',
            semibold: '600',
            bold: '700',
          },
        },
        elements: {
          card: {
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          },
          headerTitle: {
            color: '#f1f5f9',
            fontSize: '1.5rem',
            fontWeight: '600',
          },
          headerSubtitle: {
            color: '#94a3b8',
          },
          socialButtonsBlockButton: {
            backgroundColor: '#334155',
            border: '1px solid #475569',
            color: '#f1f5f9',
            '&:hover': {
              backgroundColor: '#475569',
            },
          },
          formFieldInput: {
            backgroundColor: '#1e293b',
            border: '1px solid #475569',
            color: '#f1f5f9',
            '&:focus': {
              borderColor: '#3b82f6',
              boxShadow: '0 0 0 1px #3b82f6',
            },
          },
          formButtonPrimary: {
            backgroundColor: '#3b82f6',
            '&:hover': {
              backgroundColor: '#2563eb',
            },
          },
          footerActionLink: {
            color: '#3b82f6',
            '&:hover': {
              color: '#2563eb',
            },
          },
          identityPreviewText: {
            color: '#f1f5f9',
          },
          identityPreviewEditButton: {
            color: '#3b82f6',
          },
          formFieldLabel: {
            color: '#f1f5f9',
          },
          formFieldHintText: {
            color: '#94a3b8',
          },
          formFieldErrorText: {
            color: '#ef4444',
          },
          dividerLine: {
            backgroundColor: '#475569',
          },
          dividerText: {
            color: '#94a3b8',
          },
          alternativeMethodsBlockButton: {
            backgroundColor: '#334155',
            border: '1px solid #475569',
            color: '#f1f5f9',
            '&:hover': {
              backgroundColor: '#475569',
            },
          },
          otpCodeFieldInput: {
            backgroundColor: '#1e293b',
            border: '1px solid #475569',
            color: '#f1f5f9',
            '&:focus': {
              borderColor: '#3b82f6',
            },
          },
          userButtonAvatarBox: {
            width: '2rem',
            height: '2rem',
          },
          userButtonPopoverCard: {
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
          },
          userButtonPopoverActionButton: {
            color: '#f1f5f9',
            '&:hover': {
              backgroundColor: '#334155',
            },
          },
          userPreviewTextContainer: {
            color: '#f1f5f9',
          },
          userPreviewSecondaryIdentifier: {
            color: '#94a3b8',
          },
        },
      },
    });

    return <ClerkWrappedComponent />;
  }

  return <FallbackProvider>{children}</FallbackProvider>;
}

export { ConditionalClerkApp as ClerkApp };
