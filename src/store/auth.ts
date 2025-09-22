
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
  setUser: (user: User | null, role: Role | null) => void;
  setIsLoading: (loading: boolean) => void;
  logout: () => Promise<void>;
}

const useAuthStore = create<AuthState>((set) => ({
  user: null,
  role: null,
  isLoading: true,
  setUser: (user, role) => set({ user, role }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  logout: async () => {
    await auth.signOut();
    set({ user: null, role: null, isLoading: false });
  },
}));

export { useAuthStore };
