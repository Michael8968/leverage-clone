
import { create } from 'zustand';
import { auth } from '@/lib/firebase';

export type Role = 'admin' | 'supplier' | 'user' | 'creator';

export interface User {
  uid: string;
  name: string;
  email: string;
  role: Role;
  avatar: string;
}

interface AuthState {
  user: User | null;
  role: Role | null;
  isLoading: boolean; // 仅用于表示初始认证状态是否加载完毕
  setUser: (user: User | null, role: Role | null) => void;
  setIsLoading: (loading: boolean) => void;
  logout: () => Promise<void>;
}

const useAuthStore = create<AuthState>((set) => ({
  user: null,
  role: null,
  isLoading: true, // 初始为true，表示正在等待Firebase的第一次认证回音
  setUser: (user, role) => set({ user, role }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  logout: async () => {
    await auth.signOut();
  },
}));

export { useAuthStore };
