import { motion } from 'framer-motion';
import {
  AuthBackground,
  AuthCard,
  AuthFooter,
  AuthHeader,
  AuthLogo,
} from '../components';
import { useAuth } from '../hooks/useAuth';

export const LoginPage = () => {
  const {
    isSubmitting,
    authError,
    handleSignIn,
    handleSignUp,
    handleGoogleSuccess,
    handleGoogleError,
  } = useAuth();

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-linear-to-br from-slate-950 via-blue-950/20 to-slate-950">
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
          authError={authError}
        />

        <AuthFooter />
      </motion.div>
    </div>
  );
};
