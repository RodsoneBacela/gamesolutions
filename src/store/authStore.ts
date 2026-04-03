import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface User {
  id: number;
  username: string;
  role: 'admin' | 'user';
  email?: string;
}

interface AuthState {
  user:        User | null;
  token:       string | null;
  _hydrated:   boolean;
  setAuth:     (user: User, token: string) => void;
  clearAuth:   () => void;
  isAdmin:     () => boolean;
  setHydrated: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user:      null,
      token:     null,
      _hydrated: false,
      setAuth: (user, token) => {
        set({ user, token });
        if (typeof window !== 'undefined') localStorage.setItem('gs_token', token);
      },
      clearAuth: () => {
        set({ user: null, token: null });
        if (typeof window !== 'undefined') localStorage.removeItem('gs_token');
      },
      isAdmin:     () => get().user?.role === 'admin',
      setHydrated: () => set({ _hydrated: true }),
    }),
    {
      name:    'gs-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: s => ({ user: s.user, token: s.token }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    }
  )
);
