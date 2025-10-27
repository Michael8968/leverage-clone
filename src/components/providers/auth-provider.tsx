
'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth';
import type { User } from '@/lib/types';

/**
 * AuthProvider's single responsibility:
 * On app load, it silently listens to Firebase's authentication state
 * and syncs the passively received user information to the Zustand global state.
 * It does not perform any active routing.
 */
export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setIsLoading } = useAuthStore();

  useEffect(() => {
    setIsLoading(true);
    (async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      if (token) {
        try {
          const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
          if (res.ok) {
            const { user } = await res.json();
            setUser(user as User, (user as User).role);
          } else {
            setUser(null, null);
          }
        } catch {
          setUser(null, null);
        }
      } else {
        setUser(null, null);
      }
      setIsLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}
