import { useState } from 'react';
import { classNames } from '~/utils/classNames';
import { validateEmail, validateUsername } from '~/lib/models/user';

interface RegisterFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  redirectUrl?: string;
  className?: string;
}

export const RegisterForm = ({ onSuccess: _onSuccess, onCancel, redirectUrl = '/', className }: RegisterFormProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleSignUp = () => {
    setIsLoading(true);

    // Authentication disabled - no redirect needed
    const fullRedirectUrl = redirectUrl.startsWith('http') ? redirectUrl : `${window.location.origin}${redirectUrl}`;
    window.location.href = `https://relevant-burro-77.accounts.dev/sign-up?redirect_url=${encodeURIComponent(fullRedirectUrl)}`;
  };

  return (
    <div className={classNames('w-full max-w-md mx-auto', className)}>
      <div className="bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor rounded-lg shadow-sm p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-semibold text-bolt-elements-textPrimary mb-2">Create your account</h2>
          <p className="text-bolt-elements-textSecondary mb-6">Join Mojo to start building with AI</p>

          <button
            onClick={handleSignUp}
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
              'Create Account'
            )}
          </button>

          <div className="mt-4">
            <p className="text-sm text-bolt-elements-textSecondary">
              Already have an account?{' '}
              <button
                onClick={() => (window.location.href = 'https://relevant-burro-77.accounts.dev/sign-in')}
                className="text-red-600 hover:text-red-700 font-medium transition-colors"
              >
                Sign in
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

// Custom registration form with manual validation
interface CustomRegisterFormProps {
  onSubmit: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    username?: string;
  }) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  error?: string;
  className?: string;
}

export const CustomRegisterForm = ({
  onSubmit,
  onCancel,
  isLoading = false,
  error,
  className,
}: CustomRegisterFormProps) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    username: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validateField = (field: string, value: string): string => {
    switch (field) {
      case 'email':
        if (!value) {
          return 'Email is required';
        }

        if (!validateEmail(value)) {
          return 'Please enter a valid email address';
        }

        return '';

      case 'password':
        if (!value) {
          return 'Password is required';
        }

        if (value.length < 8) {
          return 'Password must be at least 8 characters';
        }

        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
          return 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
        }

        return '';

      case 'confirmPassword':
        if (!value) {
          return 'Please confirm your password';
        }

        if (value !== formData.password) {
          return 'Passwords do not match';
        }

        return '';

      case 'firstName':
        if (!value) {
          return 'First name is required';
        }

        if (value.length > 50) {
          return 'First name must be less than 50 characters';
        }

        return '';

      case 'lastName':
        if (!value) {
          return 'Last name is required';
        }

        if (value.length > 50) {
          return 'Last name must be less than 50 characters';
        }

        return '';

      case 'username':
        if (value && !validateUsername(value)) {
          return 'Username must be 3-30 characters and contain only letters, numbers, and underscores';
        }

        return '';

      default:
        return '';
    }
  };

  const handleFieldChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleFieldBlur = (field: string, value: string) => {
    const error = validateField(field, value);
    setErrors((prev) => ({ ...prev, [field]: error }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    Object.keys(formData).forEach((field) => {
      const error = validateField(field, formData[field as keyof typeof formData]);

      if (error) {
        newErrors[field] = error;
      }
    });

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        username: formData.username || undefined,
      });
    } catch (error) {
      console.error('Registration error:', error);
    }
  };

  const inputClassName = (fieldName: string) =>
    classNames(
      'w-full px-3 py-2 border rounded-md text-sm transition-colors',
      'bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary',
      'placeholder-bolt-elements-textTertiary',
      'focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500',
      errors[fieldName]
        ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
        : 'border-bolt-elements-borderColor hover:border-bolt-elements-borderColorActive',
    );

  return (
    <div className={classNames('w-full max-w-md mx-auto', className)}>
      <div className="bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor rounded-lg shadow-sm p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-semibold text-bolt-elements-textPrimary mb-2">Create your account</h2>
          <p className="text-bolt-elements-textSecondary">Join Mojo to start building with AI</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-bolt-elements-textPrimary mb-1">
                First name
              </label>
              <input
                id="firstName"
                type="text"
                value={formData.firstName}
                onChange={(e) => handleFieldChange('firstName', e.target.value)}
                onBlur={(e) => handleFieldBlur('firstName', e.target.value)}
                className={inputClassName('firstName')}
                placeholder="John"
                disabled={isLoading}
              />
              {errors.firstName && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.firstName}</p>}
            </div>

            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-bolt-elements-textPrimary mb-1">
                Last name
              </label>
              <input
                id="lastName"
                type="text"
                value={formData.lastName}
                onChange={(e) => handleFieldChange('lastName', e.target.value)}
                onBlur={(e) => handleFieldBlur('lastName', e.target.value)}
                className={inputClassName('lastName')}
                placeholder="Doe"
                disabled={isLoading}
              />
              {errors.lastName && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.lastName}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-bolt-elements-textPrimary mb-1">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleFieldChange('email', e.target.value)}
              onBlur={(e) => handleFieldBlur('email', e.target.value)}
              className={inputClassName('email')}
              placeholder="john@example.com"
              disabled={isLoading}
            />
            {errors.email && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.email}</p>}
          </div>

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-bolt-elements-textPrimary mb-1">
              Username <span className="text-bolt-elements-textTertiary">(optional)</span>
            </label>
            <input
              id="username"
              type="text"
              value={formData.username}
              onChange={(e) => handleFieldChange('username', e.target.value)}
              onBlur={(e) => handleFieldBlur('username', e.target.value)}
              className={inputClassName('username')}
              placeholder="johndoe"
              disabled={isLoading}
            />
            {errors.username && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.username}</p>}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-bolt-elements-textPrimary mb-1">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => handleFieldChange('password', e.target.value)}
                onBlur={(e) => handleFieldBlur('password', e.target.value)}
                className={classNames(inputClassName('password'), 'pr-10')}
                placeholder="Create a strong password"
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
            {errors.password && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.password}</p>}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-bolt-elements-textPrimary mb-1">
              Confirm password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => handleFieldChange('confirmPassword', e.target.value)}
                onBlur={(e) => handleFieldBlur('confirmPassword', e.target.value)}
                className={classNames(inputClassName('confirmPassword'), 'pr-10')}
                placeholder="Confirm your password"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-bolt-elements-textTertiary hover:text-bolt-elements-textSecondary"
                disabled={isLoading}
              >
                <div className={showConfirmPassword ? 'i-ph:eye-slash text-sm' : 'i-ph:eye text-sm'} />
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.confirmPassword}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
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
                Creating account...
              </div>
            ) : (
              'Create account'
            )}
          </button>
        </form>

        <div className="mt-4 text-center">
          <p className="text-sm text-bolt-elements-textSecondary">
            Already have an account? <button className="text-red-600 hover:text-red-700 font-medium">Sign in</button>
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
