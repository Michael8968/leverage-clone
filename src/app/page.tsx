
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
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
  const { user, role, isLoading } = useAuthStore();

  useEffect(() => {
    // This effect runs whenever isLoading, user, or role state changes.
    if (!isLoading) {
      if (user && role) {
        // Role-based redirection
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

  // While isLoading is true, show a loader.
  // This covers the initial auth state check from RootLayout.
  return <GlobalLoader />;
}
