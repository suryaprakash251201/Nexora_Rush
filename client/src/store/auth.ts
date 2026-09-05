import { create } from 'zustand';
import { api, ApiError } from '@/api';
import type { PublicUser } from 'shared';

export type AuthStatus = 'checking' | 'in' | 'out';

interface AuthStore {
  user: PublicUser | null;
  status: AuthStatus;
  error: string | null;
  boot: () => Promise<void>;
  login: (identifier: string, password: string, remember: boolean) => Promise<void>;
  register: (body: { username: string; email: string; password: string; confirmPassword: string; avatarSeed?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const useAuth = create<AuthStore>((set) => ({
  user: null,
  status: 'checking',
  error: null,
  boot: async () => {
    try {
      const { user } = await api.me();
      set({ user, status: 'in' });
    } catch {
      set({ user: null, status: 'out' });
    }
  },
  login: async (identifier, password, remember) => {
    set({ error: null });
    try {
      const { user } = await api.login({ identifier, password, remember });
      set({ user, status: 'in' });
    } catch (e) {
      set({ error: e instanceof ApiError ? e.message : 'Unable to sign in.' });
      throw e;
    }
  },
  register: async (body) => {
    set({ error: null });
    try {
      const { user } = await api.register(body);
      set({ user, status: 'in' });
    } catch (e) {
      set({ error: e instanceof ApiError && !e.fields ? e.message : 'Please check the highlighted fields.' });
      throw e;
    }
  },
  logout: async () => {
    try {
      await api.logout();
    } catch {
      /* best effort */
    }
    set({ user: null, status: 'out' });
  },
  refresh: async () => {
    try {
      const { user } = await api.me();
      set({ user, status: 'in' });
    } catch {
      /* keep current */
    }
  },
}));
