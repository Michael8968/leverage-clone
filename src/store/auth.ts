
import { create } from 'zustand';
import type { User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

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
  role: Role | null;
  logout: () => void;
  // Note: setUser is now internal to the store's initialization
}

const useAuthStore = create<AuthState>()(
    (set) => {
      onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
            try {
                const userDocRef = doc(db, 'users', firebaseUser.uid);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data() as User;
                    set({ user: userData, firebaseUser, role: userData.role, isLoading: false });
                } else {
                    console.warn(`User document not found for UID: ${firebaseUser.uid}. Logging out.`);
                    await auth.signOut();
                    set({ user: null, firebaseUser: null, role: null, isLoading: false });
                }
            } catch (error) {
                console.error("Error fetching user data from Firestore:", error);
                await auth.signOut();
                set({ user: null, firebaseUser: null, role: null, isLoading: false });
            }
        } else {
            // User is signed out
            set({ user: null, firebaseUser: null, role: null, isLoading: false });
        }
      });
      
      return {
        user: null,
        firebaseUser: null,
        isLoading: true, // Start as true until the first onAuthStateChanged runs
        role: null,
        logout: () => {
          auth.signOut();
          // onAuthStateChanged will handle the state update
        },
      }
    }
);

// Initialize the store by calling it once.
// This is important to kickstart the onAuthStateChanged listener.
useAuthStore.getState();

export { useAuthStore };
