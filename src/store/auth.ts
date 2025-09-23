
import { create } from 'zustand';
import { auth } from '@/lib/firebase';
import { persist } from 'zustand/middleware';

export type Role = 'admin' | 'supplier' | 'user' | 'creator' | 'suspended';

// This is a pure data interface, safe for serialization.
export interface User {
  uid: string;
  name: string;
  email: string;
  role: Role;
  avatar: string;
  rating?: number;
  status?: 'active' | 'suspended'; // Added status field
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
