import { motion } from 'framer-motion';

export const AuthFooter = () => {
  return (
    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="text-center text-xs text-gray-500 dark:text-slate-400"
    >
      By signing in, you agree to our{' '}
      <a
        href="/terms"
        className="underline underline-offset-4 hover:text-gray-700 dark:hover:text-slate-300 transition-colors"
      >
        Terms of Service
      </a>{' '}
      and{' '}
      <a
        href="/privacy"
        className="underline underline-offset-4 hover:text-gray-700 dark:hover:text-slate-300 transition-colors"
      >
        Privacy Policy
      </a>
      .
    </motion.p>
  );
};
