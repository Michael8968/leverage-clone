'use client';

import { useEffect, useState } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';

// This component is designed to run in development mode to surface rich errors.
// In production, it does nothing.
export default function FirebaseErrorListener() {
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const handler = (err: Error) => {
      setError(err);
    };

    errorEmitter.on('permission-error', handler);

    return () => {
      errorEmitter.off('permission-error', handler);
    };
  }, []);

  if (error && process.env.NODE_ENV === 'development') {
    // When an error is set, throwing it will trigger the Next.js development error overlay.
    // This makes permission errors highly visible during development.
    throw error;
  }

  return null;
}
