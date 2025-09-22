
import { create } from 'zustand';
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
  role: Role | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setIsLoading: (loading: boolean) => void;
  logout: () => Promise<void>;
}

const useAuthStore = create<AuthState>()(
    (set) => ({
      user: null,
      role: null,
      isLoading: true, // isLoading is true only on initial load, until Firebase auth state is determined.
      setUser: (user) => {
        set({ 
            user, 
            role: user ? user.role : null,
        });
      },
      setIsLoading: (loading) => set({ isLoading: loading }),
      logout: async () => {
        try {
          await auth.signOut();
          // onAuthStateChanged in RootLayout will handle setting user to null and isLoading to false
        } catch (error) {
          console.error("Error signing out: ", error);
          // Even if signout fails, force state to logged out
          set({ user: null, role: null, isLoading: false });
        }
      },
    })
);

export { useAuthStore };
