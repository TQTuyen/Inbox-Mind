import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export const AuthLogo = () => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="absolute top-8 left-8 flex items-center gap-2"
    >
      <div className="h-8 w-8 rounded-lg bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center">
        <Sparkles className="h-5 w-5 text-white" />
      </div>
      <span className="text-xl font-bold text-white">Inbox Mind</span>
    </motion.div>
  );
};
