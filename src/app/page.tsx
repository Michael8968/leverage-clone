
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
  // We get the state and the actions from the store
  const { role, isLoading, user, setUser, setIsLoading } = useAuthStore();
  
  useEffect(() => {
    // 依赖 AuthProvider 初始化；此处不再订阅 Firebase 状态
    if (typeof window !== 'undefined') {
      // 若没有 token，标记为未登录
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setUser(null, null);
      }
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  useEffect(() => {
    // Only perform redirection after the initial authentication check is complete.
    if (!isLoading) {
      // Add an extra check for user status
      if (user?.status === 'suspended') {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_token');
        }
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
