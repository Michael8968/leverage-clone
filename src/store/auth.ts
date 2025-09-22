
import { create } from 'zustand';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

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
  logout: () => Promise<void>;
}

const useAuthStore = create<AuthState>((set) => ({
  user: null,
  role: null,
  isLoading: true,
  logout: async () => {
    await auth.signOut();
    set({ user: null, role: null, isLoading: false });
  },
}));

// Subscribe to auth changes and update store
onAuthStateChanged(auth, async (firebaseUser) => {
  const { setState } = useAuthStore;
  if (firebaseUser) {
    try {
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data() as User;
        setState({ user: userData, role: userData.role, isLoading: false });
      } else {
        console.warn(`User document not found for UID: ${firebaseUser.uid}. Logging out.`);
        await auth.signOut();
        setState({ user: null, role: null, isLoading: false });
      }
    } catch (error) {
      console.error("Error fetching user data from Firestore:", error);
      await auth.signOut();
      setState({ user: null, role: null, isLoading: false });
    }
  } else {
    // User is signed out
    setState({ user: null, role: null, isLoading: false });
  }
});


export { useAuthStore };
