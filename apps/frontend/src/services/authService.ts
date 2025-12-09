import api from '../lib/api/api';

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterCredentials {
  email: string;
  password: string;
  fullName: string;
}

interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    fullName: string;
  };
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  async register(
    credentials: RegisterCredentials
  ): Promise<{ message: string }> {
    const response = await api.post('/auth/register', credentials);
    return response.data;
  },

  async getCurrentUser(): Promise<{
    id: string;
    email: string;
    fullName: string;
  }> {
    const response = await api.get('/auth/me');
    return response.data;
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },
};
