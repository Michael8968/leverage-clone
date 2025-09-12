
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
  role: Role | null; // Add role to the state
  setUser: (firebaseUser: FirebaseUser | null) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    (set, get) => ({
      user: null,
      firebaseUser: null,
      isLoading: true,
      role: null, // Initialize role as null
      setUser: async (firebaseUser: FirebaseUser | null) => {
        // Optimization: prevent re-fetching if user hasn't changed
        if (firebaseUser?.uid === get().firebaseUser?.uid && !get().isLoading) {
          return;
        }
        
        set({ firebaseUser, isLoading: true });

        if (firebaseUser) {
            try {
                const userDocRef = doc(db, 'users', firebaseUser.uid);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data() as User;
                    set({ user: userData, role: userData.role, isLoading: false });
                } else {
                    // This case can happen briefly during registration before the user doc is created.
                    console.warn(`User document not found for UID: ${firebaseUser.uid}. This may happen during registration.`);
                    set({ user: null, role: null, isLoading: false }); // Explicitly set user to null if doc not found
                }
            } catch (error) {
                console.error("Error fetching user data from Firestore:", error);
                set({ user: null, role: null, isLoading: false });
            }
        } else {
            set({ user: null, role: null, isLoading: false });
        }
      },
      logout: () => {
        const auth = getAuth();
        auth.signOut().then(() => {
            // This will trigger the onAuthStateChanged listener,
            // which will in turn call setUser(null) and update the state.
            set({ user: null, firebaseUser: null, role: null, isLoading: false });
        });
      },
    }),
);
