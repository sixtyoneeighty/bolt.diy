import { useState } from 'react';
import { useAuthErrorReporting } from './AuthErrorBoundary';
import { classNames } from '~/utils/classNames';

interface LoginFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  redirectUrl?: string;
  className?: string;
}

export const LoginForm = ({ onSuccess: _onSuccess, onCancel, redirectUrl = '/', className }: LoginFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { reportError } = useAuthErrorReporting();

  const handleSignIn = () => {
    try {
      setIsLoading(true);

      // Authentication disabled - no redirect needed
      const fullRedirectUrl = redirectUrl.startsWith('http') ? redirectUrl : `${window.location.origin}${redirectUrl}`;
      window.location.href = `https://helpful-cicada-2.accounts.dev/sign-in?redirect_url=${encodeURIComponent(fullRedirectUrl)}`;
    } catch (error) {
      reportError(error as Error, { context: 'LoginForm handleSignIn' });
      setIsLoading(false);
    }
  };

  return (
    <div className={classNames('w-full max-w-md mx-auto', className)}>
      <div className="bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor rounded-lg shadow-sm p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-semibold text-bolt-elements-textPrimary mb-2">Welcome back</h2>
          <p className="text-bolt-elements-textSecondary mb-6">Sign in to your account to continue</p>

          <button
            onClick={handleSignIn}
            disabled={isLoading}
            className={classNames(
              'w-full py-3 px-4 rounded-md text-sm font-medium transition-colors',
              'bg-red-600 hover:bg-red-700 text-white',
              'focus:outline-none focus:ring-2 focus:ring-red-500/20',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              isLoading ? 'cursor-wait' : undefined,
            )}
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="i-svg-spinners:90-ring-with-bg text-sm animate-spin" />
                Redirecting...
              </div>
            ) : (
              'Sign In'
            )}
          </button>

          <div className="mt-4">
            <p className="text-sm text-bolt-elements-textSecondary">
              Don't have an account?{' '}
              <button
                onClick={() => (window.location.href = 'https://helpful-cicada-2.accounts.dev/sign-up')}
                className="text-red-600 hover:text-red-700 font-medium transition-colors"
              >
                Sign up
              </button>
            </p>
          </div>
        </div>

        {onCancel && (
          <div className="mt-4 text-center">
            <button
              onClick={onCancel}
              className="text-sm text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Custom login form with manual validation (authentication disabled)
interface CustomLoginFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  error?: string;
  className?: string;
}

export const CustomLoginForm = ({ onSubmit, onCancel, isLoading = false, error, className }: CustomLoginFormProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) {
      setEmailError('Email is required');
      return false;
    }

    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      return false;
    }

    setEmailError('');

    return true;
  };

  const validatePassword = (password: string): boolean => {
    if (!password) {
      setPasswordError('Password is required');
      return false;
    }

    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return false;
    }

    setPasswordError('');

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    try {
      await onSubmit(email, password);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  return (
    <div className={classNames('w-full max-w-md mx-auto', className)}>
      <div className="bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor rounded-lg shadow-sm p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-semibold text-bolt-elements-textPrimary mb-2">Welcome back</h2>
          <p className="text-bolt-elements-textSecondary">Sign in to your account to continue</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-bolt-elements-textPrimary mb-1">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);

                if (emailError) {
                  validateEmail(e.target.value);
                }
              }}
              onBlur={() => validateEmail(email)}
              className={classNames(
                'w-full px-3 py-2 border rounded-md text-sm transition-colors',
                'bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary',
                'placeholder-bolt-elements-textTertiary',
                'focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500',
                emailError
                  ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                  : 'border-bolt-elements-borderColor hover:border-bolt-elements-borderColorActive',
              )}
              placeholder="Enter your email"
              disabled={isLoading}
            />
            {emailError && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{emailError}</p>}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-bolt-elements-textPrimary mb-1">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);

                  if (passwordError) {
                    validatePassword(e.target.value);
                  }
                }}
                onBlur={() => validatePassword(password)}
                className={classNames(
                  'w-full px-3 py-2 pr-10 border rounded-md text-sm transition-colors',
                  'bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary',
                  'placeholder-bolt-elements-textTertiary',
                  'focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500',
                  passwordError
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                    : 'border-bolt-elements-borderColor hover:border-bolt-elements-borderColorActive',
                )}
                placeholder="Enter your password"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-bolt-elements-textTertiary hover:text-bolt-elements-textSecondary"
                disabled={isLoading}
              >
                <div className={showPassword ? 'i-ph:eye-slash text-sm' : 'i-ph:eye text-sm'} />
              </button>
            </div>
            {passwordError && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{passwordError}</p>}
          </div>

          <button
            type="submit"
            disabled={isLoading || !email || !password}
            className={classNames(
              'w-full py-2 px-4 rounded-md text-sm font-medium transition-colors',
              'bg-red-600 hover:bg-red-700 text-white',
              'focus:outline-none focus:ring-2 focus:ring-red-500/20',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              isLoading ? 'cursor-wait' : undefined,
            )}
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="i-svg-spinners:90-ring-with-bg text-sm animate-spin" />
                Signing in...
              </div>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        <div className="mt-4 text-center">
          <p className="text-sm text-bolt-elements-textSecondary">
            Don't have an account? <button className="text-red-600 hover:text-red-700 font-medium">Sign up</button>
          </p>
        </div>

        {onCancel && (
          <div className="mt-4 text-center">
            <button
              onClick={onCancel}
              className="text-sm text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
