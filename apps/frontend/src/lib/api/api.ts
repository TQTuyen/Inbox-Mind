import { useAuthStore } from '@fe/store/authStore';
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// Get base URL from environment variable or default to localhost
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Enable credentials for httpOnly cookies
});

// BroadcastChannel for cross-tab token synchronization
const TOKEN_CHANNEL_NAME = 'auth_token_sync';
let tokenChannel: BroadcastChannel | null = null;

if (typeof BroadcastChannel !== 'undefined') {
  tokenChannel = new BroadcastChannel(TOKEN_CHANNEL_NAME);
}

// Queue for requests waiting for token refresh
let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Proactive token refresh timer
let refreshTimer: NodeJS.Timeout | null = null;

const scheduleTokenRefresh = (expiresIn: number) => {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
  }

  // Refresh 30 seconds before expiration
  const refreshTime = Math.max(0, expiresIn * 1000 - 30000);

  refreshTimer = setTimeout(async () => {
    try {
      await refreshAccessToken();
    } catch (error) {
      console.error('Proactive token refresh failed:', error);
    }
  }, refreshTime);
};

// Decode JWT to get expiration time
const getTokenExpiration = (token: string): number | null => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp;
  } catch {
    return null;
  }
};

const handleLogout = (error: Error) => {
  processQueue(error, null);
  useAuthStore.getState().clearAuth();

  if (tokenChannel) {
    tokenChannel.postMessage({ type: 'LOGOUT' });
  }
  if (refreshTimer) {
    clearTimeout(refreshTimer);
  }

  window.location.href = '/login';
  return Promise.reject(error);
};

// Centralized token refresh function
const refreshAccessToken = async (): Promise<string> => {
  // Use Web Locks API to ensure only one refresh happens across all tabs
  if ('locks' in navigator) {
    return navigator.locks.request('token_refresh', async () => {
      return performTokenRefresh();
    });
  }

  // Fallback for browsers without Web Locks API
  return performTokenRefresh();
};

const performTokenRefresh = async (): Promise<string> => {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      // Call refresh endpoint - httpOnly refresh token is sent automatically
      const response = await axios.post(
        `${API_BASE_URL}/api/auth/refresh`,
        {},
        { withCredentials: true }
      );

      const { accessToken, expiresIn } = response.data;

      // Update store
      useAuthStore.getState().updateAccessToken(accessToken);

      // Broadcast to other tabs
      if (tokenChannel) {
        tokenChannel.postMessage({
          type: 'TOKEN_UPDATED',
          accessToken,
          expiresIn,
        });
      }

      // Schedule next refresh
      if (expiresIn) {
        scheduleTokenRefresh(expiresIn);
      } else {
        // If expiresIn not provided, calculate from token
        const exp = getTokenExpiration(accessToken);
        if (exp) {
          const now = Math.floor(Date.now() / 1000);
          scheduleTokenRefresh(exp - now);
        }
      }

      return accessToken;
    } catch (error) {
      return handleLogout(error as Error);
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

// Listen for token updates from other tabs
if (tokenChannel) {
  tokenChannel.onmessage = (event) => {
    const { type, accessToken, expiresIn } = event.data;

    if (type === 'TOKEN_UPDATED' && accessToken) {
      useAuthStore.getState().updateAccessToken(accessToken);

      if (expiresIn) {
        scheduleTokenRefresh(expiresIn);
      }
    } else if (type === 'LOGOUT') {
      useAuthStore.getState().clearAuth();
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
      window.location.href = '/login';
    }
  };
}

// Initialize proactive refresh on app load
export const initializeTokenRefresh = async (): Promise<boolean> => {
  try {
    const { accessToken, user } = useAuthStore.getState();

    if (accessToken) {
      const exp = getTokenExpiration(accessToken);
      if (exp) {
        const now = Math.floor(Date.now() / 1000);
        const expiresIn = exp - now;

        if (expiresIn > 0) {
          scheduleTokenRefresh(expiresIn);
          return true;
        }
      }
    }

    // No valid access token in memory, try to restore from refresh token cookie
    console.log('No valid access token, attempting to restore session...');
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/auth/refresh`,
        {},
        { withCredentials: true }
      );

      const {
        accessToken: newAccessToken,
        expiresIn,
        user: userData,
      } = response.data;

      // Restore authentication state
      if (userData) {
        useAuthStore.getState().setAuth(userData, newAccessToken);
      } else if (user) {
        // Keep existing user data if not returned
        useAuthStore.getState().updateAccessToken(newAccessToken);
      } else {
        // No user data available
        useAuthStore.getState().updateAccessToken(newAccessToken);
      }

      // Broadcast to other tabs
      if (tokenChannel) {
        tokenChannel.postMessage({
          type: 'TOKEN_UPDATED',
          accessToken: newAccessToken,
          expiresIn,
        });
      }

      // Schedule next refresh
      if (expiresIn) {
        scheduleTokenRefresh(expiresIn);
      } else {
        const exp = getTokenExpiration(newAccessToken);
        if (exp) {
          const now = Math.floor(Date.now() / 1000);
          scheduleTokenRefresh(exp - now);
        }
      }

      console.log('Session restored successfully');
      return true;
    } catch {
      console.log('No valid refresh token, user needs to login');
      useAuthStore.getState().clearAuth();
      return false;
    }
  } catch (error) {
    console.warn('Token refresh initialization failed:', error);
    return false;
  }
};

// Request interceptor - attach access token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const { accessToken } = useAuthStore.getState();

    // Don't attach token to auth endpoints
    const authEndpoints = [
      '/auth/login',
      '/auth/register',
      '/auth/google',
      '/auth/refresh',
    ];
    const isAuthEndpoint = authEndpoints.some((endpoint) =>
      config.url?.includes(endpoint)
    );

    if (accessToken && !isAuthEndpoint) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle 401 and refresh token
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Wait for the current refresh to complete
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const accessToken = await refreshAccessToken();

        processQueue(null, accessToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }

        return api(originalRequest);
      } catch (refreshError) {
        return handleLogout(refreshError as Error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
