
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { User } from '@/store/auth';

function GlobalLoader() {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                </div>
            </div>
        </div>
    );
}

export default function RootPage() {
  const router = useRouter();
  const { user, role, isLoading, setUser, setIsLoading } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data() as User;
            setUser(userData, userData.role);
          } else {
             console.warn(`User document not found for UID: ${firebaseUser.uid}. Logging out.`);
             await auth.signOut();
             setUser(null, null);
          }
        } catch (error) {
            console.error("Error fetching user data from Firestore:", error);
            await auth.signOut();
            setUser(null, null);
        }
      } else {
        setUser(null, null);
      }
      setIsLoading(false);
    });
    
    // Cleanup subscription on unmount
    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  useEffect(() => {
    if (!isLoading) {
      if (user && role) {
        if (role === 'admin') {
           router.replace('/demand-pool');
        } else {
           router.replace('/dashboard');
        }
      } else {
        router.replace('/login');
      }
    }
  }, [user, role, isLoading, router]);

  return <GlobalLoader />;
}
