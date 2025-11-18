// Animation utilities for Framer Motion + Tailwind
// These work seamlessly with shadcn components and respect reduced motion preferences

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.15, ease: 'easeOut' },
};

export const slideIn = {
  initial: { x: -20, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: -20, opacity: 0 },
  transition: { duration: 0.2, ease: 'easeOut' },
};

export const scaleIn = {
  initial: { scale: 0.95, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.95, opacity: 0 },
  transition: { duration: 0.15, ease: 'easeOut' },
};

export const popIn = {
  initial: { scale: 0.8, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.8, opacity: 0 },
  transition: { type: 'spring', stiffness: 400, damping: 25 },
};

// Sidebar animations
export const sidebarExpanded = {
  width: 280,
  transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] },
};

export const sidebarCollapsed = {
  width: 72,
  transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] },
};

// Hover animations for email rows
export const emailRowHover = {
  scale: 1.01,
  transition: { duration: 0.15 },
};

// Star animation
export const starAnimation = {
  scale: [1, 1.2, 1],
  transition: { duration: 0.3 },
};

// FAB pulse animation (subtle)
export const fabPulse = {
  scale: [1, 1.05, 1],
  transition: {
    duration: 2,
    repeat: Infinity,
    ease: 'easeInOut',
  },
};
