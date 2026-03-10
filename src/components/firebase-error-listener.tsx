'use client';
import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';

export function FirebaseErrorListener() {
  useEffect(() => {
    const handleError = (error: any) => {
      // In a real app, you might use a logging service.
      // For this dev environment, we throw to show the Next.js overlay.
      throw error;
    };
    errorEmitter.on('permission-error', handleError);
    return () => {
      errorEmitter.removeListener('permission-error', handleError);
    };
  }, []);

  return null;
}
