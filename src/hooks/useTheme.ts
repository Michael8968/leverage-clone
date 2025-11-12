'use client';

import { useTheme as useNextTheme } from 'next-themes';
import { useEffect, useState, useCallback } from 'react';

export type Theme = 'light' | 'dark' | 'gradient';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  mounted: boolean;
}

export function useTheme(): ThemeContextType {
  const { theme, setTheme: setNextTheme, systemTheme } = useNextTheme();
  const [mounted, setMounted] = useState(false);

  // Ensure component is mounted before rendering to avoid hydration mismatch
  useEffect(() => {
    // Use a microtask to defer the state update
    Promise.resolve().then(() => {
      setMounted(true);
    });
  }, []);

  // Determine the current theme, handling 'system' theme
  const currentTheme: Theme = (() => {
    if (!mounted) return 'light';
    
    const active = theme;
    if (active === 'system') {
      return systemTheme === 'dark' ? 'dark' : 'light';
    }
    return (active as Theme) || 'light';
  })();

  // Apply theme to HTML element and dispatch event for video updates
  useEffect(() => {
    if (!mounted) return;

    const applyTheme = (themeValue: Theme) => {
      const htmlElement = document.documentElement;
      
      // Remove all theme classes
      htmlElement.classList.remove('light', 'dark', 'gradient');
      
      // Add the current theme class
      htmlElement.classList.add(themeValue);
      
      // Also set the data attribute for compatibility
      htmlElement.setAttribute('data-theme', themeValue);
      
      console.log('Theme applied:', themeValue);
      
      // Dispatch custom event for components that need theme change notification
      window.dispatchEvent(new CustomEvent('theme-changed', {
        detail: { theme: themeValue }
      }));
    };

    applyTheme(currentTheme);
  }, [currentTheme, mounted]);

  const handleSetTheme = useCallback((newTheme: Theme) => {
    setNextTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  }, [setNextTheme]);

  return {
    theme: currentTheme,
    setTheme: handleSetTheme,
    mounted,
  };
}