'use client';
import {
  getApp,
  getApps,
  initializeApp,
  FirebaseApp,
  FirebaseOptions,
} from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Firestore, getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
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

export interface FirebaseInstances {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  storage: FirebaseStorage;
}

async function initializeFirebase(
  config: FirebaseOptions = firebaseConfig
): Promise<FirebaseInstances> {
  const app = getApps().length > 0 ? getApp() : initializeApp(config);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const storage = getStorage(app);

  try {
    // Await persistence to ensure it's set up before the app tries to fetch data.
    await enableIndexedDbPersistence(db);
    console.log('Firestore offline persistence has been enabled.');
  } catch (err: any) {
    if (err.code === 'failed-precondition') {
      // This can happen if multiple tabs are open. Persistence will still work in the primary tab.
      console.warn('Firestore persistence failed: can only be enabled in one tab at a time.');
    } else if (err.code === 'unimplemented') {
      // The browser does not support all of the features required to enable persistence.
      console.warn('Firestore persistence is not supported in this browser environment.');
    } else {
      console.error('An error occurred while enabling Firestore persistence:', err);
    }
  }

  return { app, auth, db, storage };
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
