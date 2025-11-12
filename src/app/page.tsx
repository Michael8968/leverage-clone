
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
    // Default: redirect to login/register page
    return '/login';
};

function InitialLoader() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background video-foreground">
            <div className="text-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">正在跳转到登录页...</p>
            </div>
        </div>
    );
}

/**
 * RootPage - 默认重定向到登录页
 * 
 * 访问根路径时的行为：
 * 1. 未登录用户 → 跳转到 /login
 * 2. 已登录用户 → 根据角色跳转到对应页面
 *    - admin → /demand-pool
 *    - 其他角色 → /dashboard
 * 3. 被禁用用户 → 强制登出并跳转到 /login
 */
export default function RootPage() {
  const router = useRouter();
  const { role, isLoading, user, initializeAuthListener } = useAuthStore();

  useEffect(() => {
    // Initialize authentication listener
    const unsubscribe = initializeAuthListener();
    return () => unsubscribe();
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
