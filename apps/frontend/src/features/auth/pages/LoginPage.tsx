import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AuthBackground,
  AuthCard,
  AuthFooter,
  AuthHeader,
  AuthLogo,
} from '../components';
import { useAuth } from '../hooks/useAuth';

export const LoginPage = () => {
  const [searchParams] = useSearchParams();
  const [urlError, setUrlError] = useState<string | null>(null);

  const {
    isSubmitting,
    authError,
    handleSignIn,
    handleSignUp,
    handleGoogleSuccess,
    handleGoogleError,
  } = useAuth();

  useEffect(() => {
    const error = searchParams.get('error');
    if (error) {
      const errorMessages: Record<string, string> = {
        no_token: 'Authentication failed - no token received',
        callback_failed: 'OAuth callback failed',
        access_denied: 'Google sign-in was cancelled',
      };
      setUrlError(
        errorMessages[error] || 'Authentication failed. Please try again.'
      );
    }
  }, [searchParams]);

  const displayError = authError || urlError;

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 dark:from-slate-950 dark:via-blue-950/20 dark:to-slate-950">
      <AuthBackground />
      <AuthLogo />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md space-y-8 z-10"
      >
        <AuthHeader />

        <AuthCard
          onSignIn={handleSignIn}
          onSignUp={handleSignUp}
          onGoogleSuccess={handleGoogleSuccess}
          onGoogleError={handleGoogleError}
          isSubmitting={isSubmitting}
          authError={displayError}
        />

        <AuthFooter />
      </motion.div>
    </div>
  );
};
