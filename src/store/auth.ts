
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { auth } from '@/lib/services/auth'; // Import the new centralized auth service
import type { User } from '@/lib/types';
import type { Role } from '@/lib/shared-types';

export type { Role };

interface AuthState {
  user: User | null;
  role: Role | null;
  isLoading: boolean;
  setUser: (user: User | null, role: Role | null) => void;
  setIsLoading: (loading: boolean) => void;
  loginWithEmail: (email: string, pass: string) => Promise<any>;
  signupWithEmail: (email: string, pass: string, name?: string) => Promise<any>;
  logout: () => Promise<void>;
  initializeAuthListener: () => () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      role: null,
      isLoading: true,
      
      setUser: (user, role) => set({ user, role }),
      setIsLoading: (loading) => set({ isLoading: loading }),

      loginWithEmail: (email, password) => {
        // Delegate directly to the auth service
        return auth.loginWithEmail(email, password);
      },

      signupWithEmail: (email, password, name) => {
        // Delegate directly to the auth service (pass optional name)
        return auth.signupWithEmail(email, password, name);
      },
      
      logout: async () => {
        set({ isLoading: true });
        await auth.logout();
        // The onAuthStateChanged listener in our service will handle clearing the session state.
      },

      initializeAuthListener: () => {
        console.log("Unified auth listener initializing in store...");
        set({ isLoading: true });

        // The auth service now returns unsubscribe synchronously; attach listener directly.
        try {
          const unsubscribe = auth.onAuthStateChanged((user, role) => {
            console.log("Auth state updated in store:", { user, role });
            set({ user, role, isLoading: false });
          });
          return () => {
            try { unsubscribe(); } catch {}
          };
        } catch (error) {
          console.error("Error initializing auth listener:", error);
          set({ isLoading: false });
          return () => {};
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => sessionStorage),
      // Persist only the necessary user and role information
      partialize: (state): any => ({
        user: state.user,
        role: state.role,
      }),
    }
  )
);
