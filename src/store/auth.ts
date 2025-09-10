import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type Role = 'admin' | 'supplier' | 'user' | 'creator';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar: string;
}

interface AuthState {
  role: Role | null;
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
}

const usersByRole: Record<Role, User> = {
  admin: { id: 'admin-01', name: '李明', email: 'admin@leverage.ai', role: 'admin', avatar: 'https://picsum.photos/seed/admin/100/100' },
  supplier: { id: 'supplier-01', name: '创新科技', email: 'supplier@leverage.ai', role: 'supplier', avatar: 'https://picsum.photos/seed/supplier/100/100' },
  user: { id: 'user-01', name: '张伟', email: 'user@leverage.ai', role: 'user', avatar: 'https://picsum.photos/seed/user/100/100' },
  creator: { id: 'creator-01', name: '王芳', email: 'creator@leverage.ai', role: 'creator', avatar: 'https://picsum.photos/seed/creator/100/100' },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      role: null,
      user: null,
      login: (user: User) => set({ user, role: user.role }),
      logout: () => set({ user: null, role: null }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export const getUserForRole = (role: Role) => usersByRole[role];
