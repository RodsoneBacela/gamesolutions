import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: number;
  username: string;
  role: 'admin' | 'user';
  email?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  isAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user:  null,
      token: null,
      setAuth: (user, token) => {
        set({ user, token });
        if (typeof window !== 'undefined') localStorage.setItem('gs_token', token);
      },
      clearAuth: () => {
        set({ user: null, token: null });
        if (typeof window !== 'undefined') localStorage.removeItem('gs_token');
      },
      isAdmin: () => get().user?.role === 'admin',
    }),
    { name: 'gs-auth', partialize: s => ({ user: s.user, token: s.token }) }
  )
);
