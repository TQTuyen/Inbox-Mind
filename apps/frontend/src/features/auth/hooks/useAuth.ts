import { useAuthStore } from '@fe/store/authStore';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SignInFormData, SignUpFormData } from '../utils/validation';

export const useAuth = () => {
  const navigate = useNavigate();
  const { login, register: registerUser, googleLogin } = useAuthStore();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleSignIn = async (data: SignInFormData) => {
    setIsSubmitting(true);
    setAuthError(null);

    try {
      await login(data.email, data.password);
      navigate('/inbox');
    } catch (error: any) {
      setAuthError(error.message || 'Invalid email or password');
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
    } catch (error: any) {
      setAuthError(error.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      await googleLogin(credentialResponse.credential);
      navigate('/inbox');
    } catch (error: any) {
      setAuthError('Google sign-in failed. Please try again.');
    }
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
