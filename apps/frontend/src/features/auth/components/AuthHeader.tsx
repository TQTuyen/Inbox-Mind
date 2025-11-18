import { motion } from 'framer-motion';

interface AuthHeaderProps {
  title?: string;
  subtitle?: string;
}

export const AuthHeader = ({
  title = 'Welcome back',
  subtitle = 'Your intelligent email & task manager.',
}: AuthHeaderProps) => {
  return (
    <div className="text-center space-y-2">
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="text-4xl font-bold tracking-tight text-white"
      >
        {title}
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="text-slate-400"
      >
        {subtitle}
      </motion.p>
    </div>
  );
};
