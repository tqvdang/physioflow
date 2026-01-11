import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSegments } from 'expo-router';
import {
  User,
  getUser,
  saveUser,
  saveTokens,
  clearAuth,
  isAuthenticated as checkAuth,
} from '@/lib/auth';
import { api } from '@/lib/api';

interface LoginCredentials {
  email: string;
  password: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface UseAuthReturn extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const router = useRouter();
  const segments = useSegments();

  // Check auth state on mount
  useEffect(() => {
    const checkAuthState = async () => {
      try {
        const authenticated = await checkAuth();
        if (authenticated) {
          const user = await getUser();
          setState({
            user,
            isLoading: false,
            isAuthenticated: true,
          });
        } else {
          setState({
            user: null,
            isLoading: false,
            isAuthenticated: false,
          });
        }
      } catch {
        setState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    };

    checkAuthState();
  }, []);

  // Handle navigation based on auth state
  useEffect(() => {
    if (state.isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!state.isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (state.isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)/schedule');
    }
  }, [state.isAuthenticated, state.isLoading, segments, router]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const response = await api.post<{
        accessToken: string;
        refreshToken: string;
        user: User;
      }>('/auth/login', credentials, { skipAuth: true });

      await saveTokens({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      });
      await saveUser(response.user);

      setState({
        user: response.user,
        isLoading: false,
        isAuthenticated: true,
      });
    } catch (error) {
      setState((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      await api.post('/auth/logout', {}).catch(() => {
        // Ignore logout API errors
      });
    } finally {
      await clearAuth();
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const user = await api.get<User>('/auth/me');
      await saveUser(user);
      setState((prev) => ({ ...prev, user }));
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  }, []);

  return {
    ...state,
    login,
    logout,
    refreshUser,
  };
}
