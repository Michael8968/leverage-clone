'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/dashboard', label: '仪表盘' },
  { href: '/designers', label: '设计师' },
  { href: '/demand-pool', label: '需求池' },
  { href: '/points-management', label: '积分管理' },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-56 border-r bg-muted/40 flex flex-col">
      <nav className="flex-1 p-4 space-y-1">
        {NAV_ITEMS.map(item => (
          <Link key={item.href} href={item.href} className={cn(
            'block rounded px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors',
            pathname === item.href && 'bg-primary text-primary-foreground'
          )}>{item.label}</Link>
        ))}
      </nav>
      <div className="p-4 text-xs text-muted-foreground">© {new Date().getFullYear()} Leverage</div>
    </aside>
  );
}
