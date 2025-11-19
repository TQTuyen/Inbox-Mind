import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { initializeTokenRefresh } from '../lib/api/api';

export const PrivateRoute = () => {
  const { isAuthenticated } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      // Try to restore session from refresh token
      await initializeTokenRefresh();

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
  }, [isChecking]); // Only depend on isChecking

  // Show loading state while checking authentication
  if (isChecking) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#101622]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#135bec] mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
