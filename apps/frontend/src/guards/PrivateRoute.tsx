import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { initializeTokenRefresh } from '../lib/api/api';
import { authService } from '../services/authService';
import { useAuthStore } from '../store/authStore';

export const PrivateRoute = () => {
  const { isAuthenticated, setAuth } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      // Try to restore session from refresh token
      await initializeTokenRefresh();

      // If we have a token but no user info, fetch it from backend
      const currentState = useAuthStore.getState();
      if (currentState.accessToken && !currentState.user) {
        try {
          const userData = await authService.getCurrentUser();
          if (mounted) {
            setAuth(userData, currentState.accessToken);
          }
        } catch (error) {
          console.error('Failed to fetch user info:', error);
          // Token might be invalid, clear auth state
          useAuthStore.getState().clearAuth();
        }
      }

      if (mounted) {
        setIsChecking(false);
      }
    };

    // Only check on initial mount, not when isAuthenticated changes
    if (isChecking) {
      checkAuth();
    }

    return () => {
      mounted = false;
    };
  }, [isChecking, setAuth]); // Only depend on isChecking and setAuth

  // Show loading state while checking authentication
  if (isChecking) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 dark:from-slate-950 dark:via-blue-950/20 dark:to-slate-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 dark:border-blue-400 mx-auto"></div>
          <p className="mt-4 text-gray-700 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
