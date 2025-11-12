'use client';

import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';
import { Moon, Sun, Palette } from 'lucide-react';
import React from 'react';

export function ThemeSwitcher() {
  const { theme, setTheme, mounted } = useTheme();

  // Avoid rendering until component is mounted to prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="flex gap-2">
        <div className="h-9 w-20 bg-muted animate-pulse rounded" />
        <div className="h-9 w-20 bg-muted animate-pulse rounded" />
        <div className="h-9 w-20 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="flex gap-2 flex-wrap">
      <Button
        variant={theme === 'light' ? 'default' : 'outline'}
        size="sm"
        onClick={() => setTheme('light')}
        className="flex items-center gap-2"
        title="切换到浅色主题"
      >
        <Sun className="h-4 w-4" />
        <span className="hidden sm:inline">浅色</span>
      </Button>
      <Button
        variant={theme === 'dark' ? 'default' : 'outline'}
        size="sm"
        onClick={() => setTheme('dark')}
        className="flex items-center gap-2"
        title="切换到暗黑主题"
      >
        <Moon className="h-4 w-4" />
        <span className="hidden sm:inline">深色</span>
      </Button>
      <Button
        variant={theme === 'gradient' ? 'default' : 'outline'}
        size="sm"
        onClick={() => setTheme('gradient')}
        className="flex items-center gap-2"
        title="切换到渐变主题"
      >
        <Palette className="h-4 w-4" />
        <span className="hidden sm:inline">渐变</span>
      </Button>
    </div>
  );
}
