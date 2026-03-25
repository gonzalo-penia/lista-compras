import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { TOKEN_KEY } from '../lib/api';
import type { User } from '@familycart/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => Promise<void>;
  clearAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  setAuth: async (user, token) => {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    set({ user, isAuthenticated: true });
  },
  clearAuth: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    set({ user: null, isAuthenticated: false });
  },
}));
