'use client';

import { ReactNode, useState, useEffect } from 'react';
import { FirebaseProvider } from './provider';
import { initializeFirebase, type FirebaseInstances } from './';
import { FirebaseErrorListener } from '@/components/firebase-error-listener';
import { Loader2 } from 'lucide-react';

export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  const [firebase, setFirebase] = useState<FirebaseInstances | null>(null);

  useEffect(() => {
    setFirebase(initializeFirebase());
  }, []);

  if (!firebase) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <FirebaseProvider value={firebase}>
      <FirebaseErrorListener />
      {children}
    </FirebaseProvider>
  );
}
