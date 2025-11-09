
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { Loader2 } from 'lucide-react';


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
  const { role, isLoading, user, checkAuthState } = useAuthStore();

  useEffect(() => {
    // On initial load, check the authentication state with TCB
    checkAuthState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isLoading) {
      if (user?.status === 'suspended') {
        // If user is suspended, force logout and redirect to login
        useAuthStore.getState().logout(); 
        router.replace('/login');
        return;
      }
      const path = getRedirectPath(role);
      router.replace(path);
    }
  }, [isLoading, role, user, router]);

  return <InitialLoader />;
}
