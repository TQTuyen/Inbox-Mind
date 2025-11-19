import { create } from 'zustand';
import { authService } from '@fe/services/authService';

interface User {
  id: string;
  email: string;
  fullName: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, accessToken: string) => void;
  clearAuth: () => void;
  updateAccessToken: (accessToken: string) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    fullName: string
  ) => Promise<void>;
  googleLogin: (credential: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  setAuth: (user, accessToken) => {
    set({ user, accessToken, isAuthenticated: true });
  },
  clearAuth: () => {
    set({ user: null, accessToken: null, isAuthenticated: false });
  },
  updateAccessToken: (accessToken) => {
    set({ accessToken, isAuthenticated: true });
  },
  login: async (email, password) => {
    const response = await authService.login({ email, password });
    set({
      user: response.user,
      accessToken: response.accessToken,
      isAuthenticated: true,
    });
  },
  register: async (email, password, fullName) => {
    await authService.register({ email, password, fullName });
    // After registration, log in automatically
    const loginResponse = await authService.login({ email, password });
    set({
      user: loginResponse.user,
      accessToken: loginResponse.accessToken,
      isAuthenticated: true,
    });
  },
  googleLogin: async (credential) => {
    const response = await authService.googleAuth({ credential });
    set({
      user: response.user,
      accessToken: response.accessToken,
      isAuthenticated: true,
    });
  },
  logout: async () => {
    await authService.logout();
    set({ user: null, accessToken: null, isAuthenticated: false });
  },
}));
