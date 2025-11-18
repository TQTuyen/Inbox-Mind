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
  refreshToken: string;
  user: {
    id: string;
    email: string;
    fullName: string;
  };
}

interface GoogleAuthCredentials {
  credential: string;
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post('/auth/login', credentials);
    console.log('Login response:', response.data);
    return response.data;
  },

  async register(
    credentials: RegisterCredentials
  ): Promise<{ message: string }> {
    const response = await api.post('/auth/register', credentials);
    return response.data;
  },

  async googleAuth(credentials: GoogleAuthCredentials): Promise<AuthResponse> {
    const response = await api.post('/auth/google', credentials);
    return response.data;
  },

  async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    const response = await api.post('/auth/refresh', { refreshToken });
    return response.data;
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },
};
