'use client';
import { getApp, getApps, FirebaseApp, FirebaseOptions } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { firebaseConfig } from './config';
import { useUser } from './auth/use-user';
import { useCollection } from './firestore/use-collection';
import { useDoc } from './firestore/use-doc';
import {
  FirebaseProvider,
  useFirebaseApp,
  useFirestore,
  useAuth,
  useStorage,
} from './provider';
import { FirebaseClientProvider } from './client-provider';

interface FirebaseInstances {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  storage: FirebaseStorage;
}

let firebaseInstances: FirebaseInstances | null = null;

function initializeFirebase(
  config: FirebaseOptions = firebaseConfig
): FirebaseInstances {
  if (firebaseInstances) {
    return firebaseInstances;
  }

  const app = getApps().length > 0 ? getApp() : initializeApp(config);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const storage = getStorage(app);

  firebaseInstances = { app, auth, db, storage };
  return firebaseInstances;
}

export {
  initializeFirebase,
  firebaseConfig,
  FirebaseProvider,
  FirebaseClientProvider,
  useFirebaseApp,
  useFirestore,
  useAuth,
  useStorage,
  useUser,
  useCollection,
  useDoc,
};

export type { FirebaseApp, Auth, Firestore, FirebaseStorage };
