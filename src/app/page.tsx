
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { Loader2 } from 'lucide-react';

const getRedirectPath = (role: string | null) => {
    if (role === 'admin') {
        return '/demand-pool';
    } else if (role) { // 'user', 'creator', 'supplier'
        return '/dashboard';
    }
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
  const { role, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading) {
      const path = getRedirectPath(role);
      router.replace(path);
    }
  }, [isLoading, role, router]);

  return <InitialLoader />;
}
