
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { onAuthStateChanged, getAuth } from 'firebase/auth';
import { Skeleton } from '@/components/ui/skeleton';

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
  const { user, isLoading, setUser } = useAuthStore();

  useEffect(() => {
    const auth = getAuth();
    // This is the single source of truth for auth state changes.
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [setUser]);


  useEffect(() => {
    // This effect runs whenever isLoading or user state changes.
    if (!isLoading) {
      if (user) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [user, isLoading, router]);

  // While isLoading is true, show a loader.
  return <GlobalLoader />;
}

