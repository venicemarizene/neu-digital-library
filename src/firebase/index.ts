'use client';
import {
  getApp,
  getApps,
  initializeApp,
  FirebaseApp,
  FirebaseOptions,
} from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Firestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { firebaseConfig } from './config';
import { useUser } from './auth/use-user';
import { useCollection } from './firestore/use-collection';
import { useDoc } from './firestore/use-doc';
import {
  FirebaseProvider,
  useFirebaseApp,
  useFirestore,
  useAuth,
} from './provider';
import { FirebaseClientProvider } from './client-provider';

export interface FirebaseInstances {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
}

async function initializeFirebase(
  config: FirebaseOptions = firebaseConfig
): Promise<FirebaseInstances> {
  const app = getApps().length > 0 ? getApp() : initializeApp(config);
  const auth = getAuth(app);

  const db = initializeFirestore(app, {
    cache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  } as any);

  return { app, auth, db };
}

export {
  initializeFirebase,
  firebaseConfig,
  FirebaseProvider,
  FirebaseClientProvider,
  useFirebaseApp,
  useFirestore,
  useAuth,
  useUser,
  useCollection,
  useDoc,
};

export type { FirebaseApp, Auth, Firestore };
