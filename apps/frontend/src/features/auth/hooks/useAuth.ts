import { useAuthStore } from '@fe/store/authStore';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SignInFormData, SignUpFormData } from '../utils/validation';

export const useAuth = () => {
  const navigate = useNavigate();
  const { login, register: registerUser } = useAuthStore();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleSignIn = async (data: SignInFormData) => {
    setIsSubmitting(true);
    setAuthError(null);

    try {
      await login(data.email, data.password);
      navigate('/inbox');
    } catch (error) {
      setAuthError((error as Error).message || 'Invalid email or password');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (data: SignUpFormData) => {
    setIsSubmitting(true);
    setAuthError(null);

    try {
      await registerUser(data.email, data.password, data.fullName);
      navigate('/inbox');
    } catch (error) {
      setAuthError(
        (error as Error).message || 'Registration failed. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Google OAuth now uses redirect flow - no credential handling needed
  // handleGoogleSuccess and handleGoogleError are kept for backward compatibility
  // but are no longer used since GoogleSignInButton redirects directly to backend
  const handleGoogleSuccess = () => {
    // No-op: OAuth handled by redirect
  };

  const handleGoogleError = () => {
    setAuthError('Google sign-in was cancelled or failed.');
  };

  const clearError = () => setAuthError(null);

  return {
    isSubmitting,
    authError,
    handleSignIn,
    handleSignUp,
    handleGoogleSuccess,
    handleGoogleError,
    clearError,
  };
};
