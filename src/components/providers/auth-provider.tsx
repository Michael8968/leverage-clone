
'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth';

/**
 * AuthProvider's single responsibility:
 * On application load, it initializes the authentication state listener.
 * The listener, managed by the auth service and Zustand store, will handle
 * checking the user's session (with Firebase or TCB) and updating the global state.
 * This component ensures that the auth state is checked as soon as the app loads.
 */
export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const initializeAuthListener = useAuthStore((state) => state.initializeAuthListener);

  useEffect(() => {
    // When the component mounts, initialize the auth state listener.
    // This function, from our refactored auth store, sets up the onAuthStateChanged
    // listener from our unified auth service. It returns an unsubscribe function.
    const unsubscribe = initializeAuthListener();

    // Return the unsubscribe function to be called when the component unmounts.
    // This is crucial for preventing memory leaks.
    return () => {
      unsubscribe();
    };
    
    // We only want this effect to run once when the app starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The AuthProvider does not render any UI itself. It just sets up the listener.
  return <>{children}</>;
}
