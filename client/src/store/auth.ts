import { create } from 'zustand';
import { api, ApiError } from '@/services/api';
import type { PublicUser } from 'shared';

interface AuthState {
  user: PublicUser | null;
  status: 'checking' | 'authenticated' | 'guest';
  error: string | null;
  checkAuth: () => Promise<void>;
  login: (identifier: string, password: string, remember: boolean) => Promise<void>;
  register: (body: { username: string; email: string; password: string; confirmPassword: string; avatarSeed?: string }) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (u: PublicUser | null) => void;
  refreshUser: () => Promise<PublicUser | null>;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  status: 'checking',
  error: null,
  checkAuth: async () => {
    try {
      const { user } = await api.me();
      set({ user, status: 'authenticated' });
    } catch {
      set({ user: null, status: 'guest' });
    }
  },
  login: async (identifier, password, remember) => {
    set({ error: null });
    try {
      const { user } = await api.login({ identifier, password, remember });
      set({ user, status: 'authenticated' });
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Unable to sign in right now.';
      set({ error: msg });
      throw e;
    }
  },
  register: async (body) => {
    set({ error: null });
    try {
      const { user } = await api.register(body);
      set({ user, status: 'authenticated' });
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Unable to create account right now.';
      set({ error: msg });
      throw e;
    }
  },
  logout: async () => {
    try {
      await api.logout();
    } catch {
      /* ignore network errors on logout */
    }
    set({ user: null, status: 'guest' });
  },
  setUser: (u) => set({ user: u, status: u ? 'authenticated' : 'guest' }),
  refreshUser: async () => {
    try {
      const { user } = await api.me();
      set({ user, status: 'authenticated' });
      return user;
    } catch {
      return get().user;
    }
  },
}));
