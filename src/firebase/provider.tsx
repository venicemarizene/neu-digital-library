'use client';

import {
  createContext,
  useContext,
  useMemo,
  ReactNode,
  FC,
  ComponentType,
} from 'react';

import { FirebaseApp } from 'firebase/app';
import { Auth } from 'firebase/auth';
import { Firestore } from 'firebase/firestore';
import { FirebaseStorage } from 'firebase/storage';

interface FirebaseContextValue {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  storage: FirebaseStorage;
}

// CRITICAL FIX:
// The context is changed to allow a `null` value.
// This allows the FirebaseClientProvider to render immediately with a null context
// while it waits for the async Firebase initialization to complete.
const FirebaseContext = createContext<FirebaseContextValue | null>(
  null
);

interface FirebaseProviderProps {
  children: ReactNode;
  value: FirebaseContextValue | null;
}

export const FirebaseProvider: FC<FirebaseProviderProps> = ({
  children,
  value,
}) => {
  return (
    <FirebaseContext.Provider value={value}>{children}</FirebaseContext.Provider>
  );
};

export function useFirebase() {
  const context = useContext(FirebaseContext);
  // The check for `undefined` is still a safeguard, but now we return null
  // if the context has not been initialized yet.
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
}

export function useFirebaseApp() {
  // CRITICAL FIX: Safely access the app instance, returning null if not ready.
  return useFirebase()?.app ?? null;
}

export function useAuth() {
  // CRITICAL FIX: Safely access the auth instance, returning null if not ready.
  return useFirebase()?.auth ?? null;
}

export function useFirestore() {
  // CRITICAL FIX: Safely access the firestore instance, returning null if not ready.
  return useFirebase()?.db ?? null;
}

export function useStorage() {
  // CRITICAL FIX: Safely access the storage instance, returning null if not ready.
  return useFirebase()?.storage ?? null;
}

export function withFirebase<T extends object>(
  Component: ComponentType<T>
): FC<T> {
  const WithFirebase: FC<T> = (props) => {
    const firebase = useFirebase();
    // Pass firebase instances only if they are not null
    return <Component {...props} {...firebase} />;
  };
  return WithFirebase;
}
