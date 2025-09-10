
import { create } from 'zustand';
import type { User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '@/lib/firebase';

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
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  setUser: (firebaseUser: FirebaseUser | null) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    (set, get) => ({
      user: null,
      firebaseUser: null,
      isLoading: true,
      setUser: async (firebaseUser: FirebaseUser | null) => {
        if (firebaseUser === get().firebaseUser && !get().isLoading) {
          return;
        }

        if (firebaseUser) {
            set({ isLoading: true });
            try {
                const userDocRef = doc(db, 'users', firebaseUser.uid);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    set({ user: userDocSnap.data() as User, firebaseUser, isLoading: false });
                } else {
                    console.warn(`User document not found for UID: ${firebaseUser.uid}. This may happen during registration.`);
                    const partialUser: User = {
                        id: firebaseUser.uid,
                        email: firebaseUser.email!,
                        // This role will be updated once the user doc is created.
                        role: 'user', 
                        name: firebaseUser.displayName || firebaseUser.email!,
                        avatar: firebaseUser.photoURL || `https://picsum.photos/seed/${firebaseUser.uid}/100/100`,
                    };
                    set({ user: partialUser, firebaseUser, isLoading: false });
                }
            } catch (error) {
                console.error("Error fetching user data from Firestore:", error);
                set({ user: null, firebaseUser: null, isLoading: false });
            }
        } else {
            set({ user: null, firebaseUser: null, isLoading: false });
        }
      },
      logout: () => {
        const auth = getAuth();
        auth.signOut();
        set({ user: null, firebaseUser: null, isLoading: false });
      },
    }),
);
