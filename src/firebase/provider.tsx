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

const FirebaseContext = createContext<FirebaseContextValue | undefined>(
  undefined
);

interface FirebaseProviderProps {
  children: ReactNode;
  value: FirebaseContextValue;
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
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
}

export function useFirebaseApp() {
  return useFirebase().app;
}

export function useAuth() {
  return useFirebase().auth;
}

export function useFirestore() {
  return useFirebase().db;
}

export function useStorage() {
  return useFirebase().storage;
}

export function withFirebase<T extends object>(
  Component: ComponentType<T>
): FC<T> {
  const WithFirebase: FC<T> = (props) => {
    const firebase = useFirebase();
    return <Component {...props} {...firebase} />;
  };
  return WithFirebase;
}
