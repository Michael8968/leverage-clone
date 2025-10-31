'use client';

import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';
import { Moon, Sun, Palette } from 'lucide-react';

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex gap-2">
      <Button
        variant={theme === 'light' ? 'default' : 'outline'}
        size="sm"
        onClick={() => setTheme('light')}
        className="flex items-center gap-2"
      >
        <Sun className="h-4 w-4" />
        浅色
      </Button>
      <Button
        variant={theme === 'dark' ? 'default' : 'outline'}
        size="sm"
        onClick={() => setTheme('dark')}
        className="flex items-center gap-2"
      >
        <Moon className="h-4 w-4" />
        深色
      </Button>
      <Button
        variant={theme === 'gradient' ? 'default' : 'outline'}
        size="sm"
        onClick={() => setTheme('gradient')}
        className="flex items-center gap-2"
      >
        <Palette className="h-4 w-4" />
        渐变
      </Button>
    </div>
  );
}