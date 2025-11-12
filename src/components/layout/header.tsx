'use client';

import React from 'react';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';

export function Header() {
  const { user } = useAuthStore();
  return (
    <header className="flex items-center justify-between border-b px-4 py-3">
      <h1 className="text-lg font-semibold">Leverage</h1>
      <div className="flex items-center gap-3">
        {user ? (
          <span className="text-sm text-muted-foreground">{user.name || user.email}</span>
        ) : (
          <span className="text-sm text-muted-foreground">未登录</span>
        )}
        <Button size="sm" variant="outline">帮助</Button>
      </div>
    </header>
  );
}
