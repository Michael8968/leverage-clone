
'use client';

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { DynamicVideoBackground } from '@/components/features/dynamic-video-background';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const { theme } = useTheme();
  
  // --- Initialize Authentication State ---
  // This effect runs once on component mount to check the user's auth state.
  const initializeAuth = useAuthStore((state) => state.initializeAuthListener);
  useEffect(() => {
    const unsubscribe = initializeAuth();
    // In dev mode, this cleans up the Firebase listener when the component unmounts.
    // In prod mode, it does nothing.
    return () => unsubscribe();
  }, [initializeAuth]);
  // -------------------------------------

  const isDashboard = pathname === '/dashboard';

  const mainContentClass = cn(
    'relative flex min-h-screen flex-col transition-all duration-300',
    {
      'bg-background': !isDashboard || theme !== 'gradient',
    }
  );

  return (
    <div className="relative min-h-screen">
      {isDashboard && <DynamicVideoBackground />}
      <div className={mainContentClass}>
        <Header />
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 p-4 md:p-6 lg:p-8">
            {children}
          </main>
        </div>
        <Toaster />
      </div>
    </div>
  );
}
