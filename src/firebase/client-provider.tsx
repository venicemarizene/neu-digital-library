'use client';

import { ReactNode } from 'react';
import { FirebaseProvider } from './provider';
import { initializeFirebase } from './';
import { FirebaseErrorListener } from '@/components/firebase-error-listener';

export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  const firebase = initializeFirebase();
  return (
    <FirebaseProvider value={firebase}>
      <FirebaseErrorListener />
      {children}
    </FirebaseProvider>
  );
}
