import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconButton } from '~/components/ui/IconButton';
import { userProfileStore, userSessionStore } from '~/lib/stores/user';
import { createUser, createUserSession } from '~/lib/models/user';
import { toast } from 'react-toastify';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface SignInFormData {
  email: string;
  password: string;
}

interface SignUpFormData extends SignInFormData {
  name: string;
  confirmPassword: string;
}

export function SignInModal({ isOpen, onClose, onSuccess }: SignInModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [signInData, setSignInData] = useState<SignInFormData>({
    email: '',
    password: '',
  });
  const [signUpData, setSignUpData] = useState<SignUpFormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Simulate API call - replace with actual authentication
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Mock successful sign-in
      const mockUser = createUser({
        id: 'user-' + Date.now(),
        email: signInData.email,
        firstName: signInData.email.split('@')[0],
      });

      const mockSession = createUserSession({
        id: 'session-' + Date.now(),
        userId: mockUser.id,
        token: 'mock-token-' + Date.now(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      });

      userProfileStore.set(mockUser);
      userSessionStore.set(mockSession);

      toast.success('Successfully signed in!');
      onSuccess?.();
      onClose();
    } catch {
      toast.error('Failed to sign in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (signUpData.password !== signUpData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      // Simulate API call - replace with actual authentication
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Mock successful sign-up
      const mockUser = createUser({
        id: 'user-' + Date.now(),
        email: signUpData.email,
        firstName: signUpData.name,
      });

      const mockSession = createUserSession({
        id: 'session-' + Date.now(),
        userId: mockUser.id,
        token: 'mock-token-' + Date.now(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      });

      userProfileStore.set(mockUser);
      userSessionStore.set(mockSession);

      toast.success('Account created successfully!');
      onSuccess?.();
      onClose();
    } catch {
      toast.error('Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={handleClose}
          >
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor rounded-lg shadow-xl w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-bolt-elements-borderColor">
                <h2 className="text-xl font-semibold text-bolt-elements-textPrimary">
                  {isSignUp ? 'Create Account' : 'Sign In'}
                </h2>
                <IconButton
                  icon="i-ph:x"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary"
                />
              </div>

              <div className="p-6">
                {isSignUp ? (
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-bolt-elements-textPrimary mb-2">Name</label>
                      <input
                        type="text"
                        required
                        value={signUpData.name}
                        onChange={(e) => setSignUpData({ ...signUpData, name: e.target.value })}
                        className="w-full px-3 py-2 bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor rounded-md text-bolt-elements-textPrimary focus:outline-none focus:ring-2 focus:ring-bolt-elements-focus focus:border-transparent"
                        placeholder="Enter your name"
                        disabled={isLoading}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-bolt-elements-textPrimary mb-2">Email</label>
                      <input
                        type="email"
                        required
                        value={signUpData.email}
                        onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                        className="w-full px-3 py-2 bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor rounded-md text-bolt-elements-textPrimary focus:outline-none focus:ring-2 focus:ring-bolt-elements-focus focus:border-transparent"
                        placeholder="Enter your email"
                        disabled={isLoading}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-bolt-elements-textPrimary mb-2">Password</label>
                      <input
                        type="password"
                        required
                        value={signUpData.password}
                        onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                        className="w-full px-3 py-2 bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor rounded-md text-bolt-elements-textPrimary focus:outline-none focus:ring-2 focus:ring-bolt-elements-focus focus:border-transparent"
                        placeholder="Enter your password"
                        disabled={isLoading}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-bolt-elements-textPrimary mb-2">
                        Confirm Password
                      </label>
                      <input
                        type="password"
                        required
                        value={signUpData.confirmPassword}
                        onChange={(e) => setSignUpData({ ...signUpData, confirmPassword: e.target.value })}
                        className="w-full px-3 py-2 bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor rounded-md text-bolt-elements-textPrimary focus:outline-none focus:ring-2 focus:ring-bolt-elements-focus focus:border-transparent"
                        placeholder="Confirm your password"
                        disabled={isLoading}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-bolt-elements-button-primary-background hover:bg-bolt-elements-button-primary-backgroundHover text-bolt-elements-button-primary-text py-2 px-4 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? 'Creating Account...' : 'Create Account'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-bolt-elements-textPrimary mb-2">Email</label>
                      <input
                        type="email"
                        required
                        value={signInData.email}
                        onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                        className="w-full px-3 py-2 bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor rounded-md text-bolt-elements-textPrimary focus:outline-none focus:ring-2 focus:ring-bolt-elements-focus focus:border-transparent"
                        placeholder="Enter your email"
                        disabled={isLoading}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-bolt-elements-textPrimary mb-2">Password</label>
                      <input
                        type="password"
                        required
                        value={signInData.password}
                        onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                        className="w-full px-3 py-2 bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor rounded-md text-bolt-elements-textPrimary focus:outline-none focus:ring-2 focus:ring-bolt-elements-focus focus:border-transparent"
                        placeholder="Enter your password"
                        disabled={isLoading}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-bolt-elements-button-primary-background hover:bg-bolt-elements-button-primary-backgroundHover text-bolt-elements-button-primary-text py-2 px-4 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? 'Signing In...' : 'Sign In'}
                    </button>
                  </form>
                )}

                <div className="mt-6 text-center">
                  <button
                    type="button"
                    onClick={() => setIsSignUp(!isSignUp)}
                    disabled={isLoading}
                    className="text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary transition-colors disabled:opacity-50"
                  >
                    {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
