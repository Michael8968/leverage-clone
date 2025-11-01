'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider'; //
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


export default function RootPage() {
  const router = useRouter();
  const { user, role, isLoading } = useAuth(); // 使用新的 useAuth hook
  
  useEffect(() => {
    // 只有在初始加载完成后才执行跳转逻辑
    if (!isLoading) {
      if (user?.status === 'suspended') {
        // 注销逻辑已在 useAuth 中处理
        router.replace('/login');
        return;
      }
      const path = getRedirectPath(role);
      router.replace(path);
    }
  }, [isLoading, role, user, router]);

  // 在认证状态确认前，始终显示加载动画
  return <InitialLoader />;
}
