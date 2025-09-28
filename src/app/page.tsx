
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { Loader2 } from 'lucide-react';
import { auth } from '@/lib/firebase'; // Import auth
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User } from '@/lib/types';


const getRedirectPath = (role: string | null): string => {
    if (role === 'admin') {
        return '/demand-pool';
    }
    if (role) { // Covers 'user', 'creator', 'supplier'
        return '/dashboard';
    }
    // If no role, the user is not logged in
    return '/login';
};

function InitialLoader() {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
    );
}

/**
 * RootPage's single responsibility is to act as a routing guard.
 * It waits for the AuthProvider to determine the authentication state (isLoading === false),
 * and then redirects the user to the appropriate page based on their role.
 */
export default function RootPage() {
  const router = useRouter();
  // We get the state and the actions from the store
  const { role, isLoading, user, setUser, setIsLoading } = useAuthStore();
  
  useEffect(() => {
    // onAuthStateChanged should be placed in the highest-level client component, which is RootPage
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data() as User;
          setUser(userData, userData.role);
        } else {
          // If the user exists in Auth but not in Firestore, this is an inconsistent state.
          // Forcing logout is a safe way to handle this.
          await auth.signOut();
          setUser(null, null);
        }
      } else {
        setUser(null, null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array ensures this runs only once on mount


  useEffect(() => {
    // Only perform redirection after the initial authentication check is complete.
    if (!isLoading) {
      // Add an extra check for user status
      if (user?.status === 'suspended') {
        auth.signOut(); // Force sign out if suspended
        router.replace('/login');
        return;
      }
      const path = getRedirectPath(role);
      router.replace(path);
    }
  }, [isLoading, role, user, router]);

  // While the auth state is being determined, show a loader.
  return <InitialLoader />;
}
