import { create } from 'zustand';
import type { User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export type Role = 'admin' | 'supplier' | 'user' | 'creator';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  role: Role | null;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
}

const useAuthStore = create<AuthState>()(
    (set) => ({
      user: null,
      isLoading: true, // Start as true until the auth state is first determined
      role: null,
      setUser: (user) => {
        set({ 
            user, 
            role: user ? user.role : null,
            isLoading: false 
        });
      },
      logout: async () => {
        try {
          await auth.signOut();
          set({ user: null, role: null, isLoading: false });
        } catch (error) {
          console.error("Error signing out: ", error);
          // Even if signout fails, force state to logged out
          set({ user: null, role: null, isLoading: false });
        }
      },
    })
);

export { useAuthStore };
