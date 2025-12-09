import { useAuthStore } from '@fe/store/authStore';
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export const OAuthCallbackPage = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) {
      console.log('Callback already processed, skipping...');
      return;
    }

    const handleCallback = async () => {
      try {
        // Extract access token from URL
        const params = new URLSearchParams(window.location.search);
        const accessToken = params.get('accessToken');
        const error = params.get('error');

        if (error) {
          console.error('OAuth error:', error);
          navigate('/login?error=' + encodeURIComponent(error));
          return;
        }

        if (!accessToken) {
          console.error('No access token in callback');
          navigate('/login?error=no_token');
          return;
        }

        hasProcessed.current = true;

        // Decode JWT to get user info
        try {
          console.log(accessToken);
          const payload = JSON.parse(atob(accessToken.split('.')[1]));
          const user = {
            id: payload.sub || payload.userId,
            email: payload.email,
            fullName: payload.name || payload.fullName || payload.email,
          };

          // Set auth state
          setAuth(user, accessToken);
          console.log('user::', user);

          // Navigate to inbox
          navigate('/inbox', { replace: true });
        } catch (decodeError) {
          console.error('Failed to decode token:', decodeError);

          // Even if we can't decode, store the token and let the app fetch user info
          useAuthStore.setState({
            accessToken,
            isAuthenticated: true,
            user: null, // Will be fetched by the app
          });

          navigate('/inbox', { replace: true });
        }
      } catch (error) {
        console.error('OAuth callback error:', error);
        navigate('/login?error=callback_failed');
      }
    };

    handleCallback();
  }, [navigate, setAuth]);

  return (
    <div className="flex items-center justify-center h-screen bg-[#101622]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#135bec] mx-auto"></div>
        <p className="mt-4 text-gray-400">Completing sign in...</p>
      </div>
    </div>
  );
};
