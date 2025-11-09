
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { auth, db } from '@/lib/tcb';
import type { User } from '@/lib/types';
import type { Role } from '@/lib/shared-types';

export type { Role };

interface AuthState {
  user: User | null;
  role: Role | null;
  isLoading: boolean;
  setUser: (user: User | null, role: Role | null) => void;
  setIsLoading: (loading: boolean) => void;
  logout: () => Promise<void>;
  checkAuthState: () => Promise<void>;
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
        if (auth) {
          await auth.signOut();
        }
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_token'); // Clean up old token
        }
        set({ user: null, role: null, isLoading: false });
      },
      
      checkAuthState: async () => {
        set({ isLoading: true });
        if (!auth || !db) {
          set({ user: null, role: null, isLoading: false });
          return;
        }
        try {
          const loginState = await auth.getLoginState();
          if (loginState) {
            // TCB user is logged in. Now, we need our app's user profile.
            // Note: TCB auth user uid is stored in the 'users' collection's _id field.
            const userRes = await db.collection('users').where({ _id: loginState.uid }).get();
            if (userRes.data && userRes.data.length > 0) {
              const appUser = userRes.data[0] as User;
              set({ user: appUser, role: appUser.role || 'user', isLoading: false });
            } else {
              // Logged in to TCB, but no user profile in our DB. This can happen during signup.
              // For now, treat as logged out. The signup flow will create the user doc.
              set({ user: null, role: null, isLoading: false });
            }
          } else {
            set({ user: null, role: null, isLoading: false });
          }
        } catch (e) {
          console.error("Auth check failed:", e);
          set({ user: null, role: null, isLoading: false });
        }
      }
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
