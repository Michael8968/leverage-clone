
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { app as firebaseApp } from '@/lib/firebase';
import type { User as AppUser } from '@/lib/types';
import type { Role } from '@/lib/shared-types';
import type { AuthService } from './auth';

// This function was originally in the auth store to sync the Firebase user with the backend.
const syncWithBackend = async (idToken: string): Promise<{ user: AppUser | null; role: Role | null }> => {
  try {
    // This API route is expected to handle the token verification and return the app user profile.
    const response = await fetch('/api/auth/firebase-sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
    });
    if (!response.ok) {
      console.error('Backend sync failed with status:', response.status);
      return { user: null, role: null };
    }
    const data = await response.json();
    return { user: data.user, role: data.user?.role || 'user' };
  } catch (error) {
    console.error("Error syncing with backend:", error);
    return { user: null, role: null };
  }
};

class FirebaseAuth implements AuthService {
    private auth = getAuth(firebaseApp);

    onAuthStateChanged(callback: (user: AppUser | null, role: Role | null) => void): () => void {
        return onAuthStateChanged(this.auth, async (firebaseUser) => {
            if (firebaseUser) {
                // If user is signed in to Firebase, get the ID token and sync with our backend.
                const idToken = await firebaseUser.getIdToken();
                const { user, role } = await syncWithBackend(idToken);
                callback(user, role);
            } else {
                // If user is signed out, clear the app user state.
                callback(null, null);
            }
        });
    }

    loginWithEmail(email: string, pass: string) {
        return signInWithEmailAndPassword(this.auth, email, pass);
    }

    signupWithEmail(email: string, pass: string) {
        return createUserWithEmailAndPassword(this.auth, email, pass);
    }

    logout() {
        return signOut(this.auth);
    }
}

export const firebaseAuth = new FirebaseAuth();
