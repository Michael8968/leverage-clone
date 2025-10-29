'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import type { FirestorePermissionError } from '@/firebase/errors';

/**
 * A client component that listens for 'permission-error' events and throws them.
 * This is a crucial piece of the debugging architecture. When an error is thrown
 * here, Next.js's development overlay will catch it and display the rich,
 * contextual error information, making it much easier to debug security rules.
 */
export default function FirebaseErrorListener() {
  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      // We throw the error here so that Next.js's error overlay can catch it
      // during development. This provides a much better debugging experience
      // than just logging to the console.
      throw error;
    };

    errorEmitter.on('permission-error', handleError);

    // Cleanup listener on component unmount
    return () => {
      errorEmitter.removeListener('permission-error', handleError);
    };
  }, []);

  return null; // This component does not render anything
}
