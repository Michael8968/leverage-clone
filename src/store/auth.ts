
import { create } from 'zustand';
import { auth } from '@/lib/firebase';
import { persist } from 'zustand/middleware';
import type { User as FirebaseUser } from 'firebase/auth';

export type Role = 'admin' | 'supplier' | 'user' | 'creator';

export interface User {
  uid?: string;
  id?: string;
  name: string;
  email: string;
  role: Role;
  avatar: string;
}

interface AuthState {
  user: User | null;
  role: Role | null;
  isLoading: boolean;
  setUser: (user: User | null, role: Role | null) => void;
  setIsLoading: (loading: boolean) => void;
  logout: () => Promise<void>;
}

const useAuthStore = create<AuthState>()(
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
      name: 'auth-storage', // name of the item in the storage (must be unique)
    }
  )
);


export { useAuthStore };
