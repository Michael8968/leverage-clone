import { create } from 'zustand';
import { auth } from '@/lib/firebase';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, Role } from '@/lib/types';


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
        await auth.signOut();
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
