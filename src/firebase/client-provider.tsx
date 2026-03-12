'use client';

import { ReactNode, useState, useEffect } from 'react';
import { FirebaseProvider } from './provider';
import { initializeFirebase, type FirebaseInstances } from './';
import { FirebaseErrorListener } from '@/components/firebase-error-listener';

export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  // This state holds the Firebase instances. It starts as null.
  const [firebase, setFirebase] = useState<FirebaseInstances | null>(null);

  // useEffect now runs on the client to initialize Firebase in the background.
  useEffect(() => {
    const init = async () => {
      const instances = await initializeFirebase();
      setFirebase(instances);
    };
    init();
  }, []);

  // CRITICAL FIX:
  // Previously, this component returned a <Loader /> if `firebase` was null.
  // This caused a HYDRATION MISMATCH because the server would render the page content (`children`),
  // but the initial client render would show a loader, breaking React's rules.
  //
  // The fix is to ALWAYS render the FirebaseProvider and its children.
  // The `value` of the provider will be `null` until Firebase initializes.
  // The `useFirebase` and other consumer hooks have been updated in `provider.tsx`
  // to handle this initial null state gracefully.
  return (
    <FirebaseProvider value={firebase}>
      {/* The FirebaseErrorListener should only be active when firebase is available */}
      {firebase && <FirebaseErrorListener />}
      {children}
    </FirebaseProvider>
  );
}
