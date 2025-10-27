import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '@/lib/types';
import type { Role } from '@/lib/shared-types';

// Re-export Role for backward compatibility with imports from '@/store/auth'
export type { Role };


interface AuthState {
  user: User | null;
  role: Role | null;
  isLoading: boolean;
  setUser: (user: User | null, role: Role | null) => void;
  setIsLoading: (loading: boolean) => void;
  logout: () => Promise<void>;
}

type PersistedState = {
  user: User | null;
  role: Role | null;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      role: null,
      isLoading: true,
      setUser: (user, role) => set({ user, role }),
      setIsLoading: (loading) => set({ isLoading: loading }),
      logout: async () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_token');
        }
        set({ user: null, role: null });
      },
    }),
    {
      name: 'auth-storage', 
      storage: createJSONStorage(() => sessionStorage), 
      partialize: (state): PersistedState => ({
        user: state.user,
        role: state.role,
      }),
    }
  )
);
