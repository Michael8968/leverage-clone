'use client';

import { ThemeProvider } from '@/components/providers/theme-provider';
import AuthProvider from '@/components/providers/auth-provider';
import { ErrorProvider } from '@/hooks/useErrorHandler';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      themes={['light', 'dark', 'gradient']}
      storageKey="theme"
    >
      <ErrorProvider
        config={{
          showToast: true,
          logErrors: true
        }}
      >
        <AuthProvider>{children}</AuthProvider>
      </ErrorProvider>
    </ThemeProvider>
  );
}
