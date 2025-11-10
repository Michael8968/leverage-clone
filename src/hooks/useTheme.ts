'use client';

import { useState, useEffect } from 'react';

export type Theme = 'light' | 'dark' | 'gradient';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export function useTheme(): ThemeContextType {
  const [theme, setThemeState] = useState<Theme>('light');

  // 从localStorage加载主题
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme && ['light', 'dark', 'gradient'].includes(savedTheme)) {
      console.log('Theme loaded from localStorage:', savedTheme);
      setThemeState(savedTheme);
      applyTheme(savedTheme);
    } else {
      // 检查系统偏好
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const defaultTheme = systemPrefersDark ? 'dark' : 'light';
      console.log('Using system preference:', defaultTheme);
      setThemeState(defaultTheme);
      applyTheme(defaultTheme);
    }
  }, []);

  // 监听系统主题变化
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      // 只在没有手动设置主题时响应系统变化
      const savedTheme = localStorage.getItem('theme');
      if (!savedTheme) {
        const newTheme = e.matches ? 'dark' : 'light';
        console.log('System theme changed to:', newTheme);
        setThemeState(newTheme);
        applyTheme(newTheme);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // 监听主题变化事件
  useEffect(() => {
    const handleThemeChange = () => {
      const savedTheme = localStorage.getItem('theme') as Theme;
      if (savedTheme && ['light', 'dark', 'gradient'].includes(savedTheme)) {
        console.log('Theme changed via event:', savedTheme);
        setThemeState(savedTheme);
        applyTheme(savedTheme);
      }
    };

    window.addEventListener('theme-changed', handleThemeChange);
    return () => window.removeEventListener('theme-changed', handleThemeChange);
  }, []);

  const applyTheme = (newTheme: Theme) => {
    // 应用到document元素
    document.documentElement.className = newTheme;

    // 应用到CSS变量或全局样式
    const root = document.documentElement;
    switch (newTheme) {
      case 'dark':
        root.style.setProperty('--background', '#0f1724');
        root.style.setProperty('--foreground', '#f8fafc');
        break;
      case 'gradient':
        root.style.setProperty('--background', 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)');
        root.style.setProperty('--foreground', '#ffffff');
        break;
      case 'light':
      default:
        root.style.setProperty('--background', '#ffffff');
        root.style.setProperty('--foreground', '#0f1724');
        break;
    }

    console.log('Applied theme to DOM:', newTheme);
  };

  const setTheme = (newTheme: Theme) => {
    console.log('Setting theme to:', newTheme);
    localStorage.setItem('theme', newTheme);
    setThemeState(newTheme);
    applyTheme(newTheme);

    // 分发主题变化事件，触发视频重新加载
    window.dispatchEvent(new CustomEvent('theme-changed', {
      detail: { theme: newTheme }
    }));
  };

  return {
    theme,
    setTheme,
  };
}