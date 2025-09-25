
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { Loader2 } from 'lucide-react';
import { auth } from '@/lib/firebase'; // Import auth

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
  const { role, isLoading, user } = useAuthStore();

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

  // While the auth state is being determined by AuthProvider, show a loader.
  return <InitialLoader />;
}
