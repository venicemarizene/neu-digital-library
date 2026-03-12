'use client';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser, signOut } from 'firebase/auth';
import { doc, onSnapshot, DocumentData } from 'firebase/firestore';
import { useAuth, useFirestore } from '@/firebase';
import { AppUser } from '@/lib/types';

interface UserData {
  user: FirebaseUser | null;
  appUser: AppUser | null;
  loading: boolean;
  isProfileComplete: boolean | null;
  isAdmin: boolean;
  isBlocked: boolean;
}

const ADMIN_EMAIL = 'venicemarizene.linga@neu.edu.ph';

export const useUser = (): UserData => {
  const auth = useAuth();
  const db = useFirestore();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProfileComplete, setIsProfileComplete] = useState<boolean | null>(
    null
  );
  const [isAdmin, setIsAdmin] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    // This effect now depends on both `auth` and `db` becoming available.
    // It will not run until Firebase has been initialized on the client.
    if (!auth || !db) {
      // By simply returning, we keep `loading` as `true` until the services are ready,
      // which prevents a hydration mismatch.
      return;
    };
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        if (!firebaseUser.email?.endsWith('@neu.edu.ph')) {
          localStorage.setItem('authError', 'invalid-domain');
          signOut(auth);
          return;
        }
        setUser(firebaseUser);
        // The second useEffect will now handle fetching the user profile and setting loading to false.
      } else {
        // This is the case for a logged-out user.
        setUser(null);
        setAppUser(null);
        setIsProfileComplete(null);
        setIsAdmin(false);
        setIsBlocked(false);
        setLoading(false); // We can safely set loading to false here.
      }
    });

    return () => unsubscribeAuth();
  }, [auth, db]); // Added `db` to the dependency array for robustness.

  useEffect(() => {
    // This effect is for fetching the Firestore user profile.
    if (!user || !db) {
      // If the user is null (logged out), the first effect already handled setting loading to false.
      // If the db is not ready, we just wait.
      return;
    }
    const userDocRef = doc(db, 'Users', user.uid);
    const unsubscribeFirestore = onSnapshot(
      userDocRef,
      (docSnap) => {
        const isDesignatedAdmin = user.email === ADMIN_EMAIL;
        if (docSnap.exists()) {
          const userData = {
            uid: docSnap.id,
            ...docSnap.data(),
          } as AppUser;
          setAppUser(userData);
          setIsProfileComplete(userData.onboardingComplete || false);
          setIsAdmin(userData.isAdmin || isDesignatedAdmin);
          setIsBlocked(userData.isBlocked || false);
        } else {
          // This is a new user who hasn't completed onboarding.
          setAppUser(null);
          setIsProfileComplete(false);
          // Still grant admin status if they are the designated admin.
          setIsAdmin(isDesignatedAdmin);
          setIsBlocked(false);
        }
        // This is the final step in the loading process for a logged-in user.
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to user document:', error);
        setAppUser(null);
        setIsProfileComplete(false);
        setIsAdmin(false);
        setIsBlocked(false);
        setLoading(false); // Also set loading false on error.
      }
    );
    return () => unsubscribeFirestore();
  }, [user, db]);

  return { user, appUser, loading, isProfileComplete, isAdmin, isBlocked };
};
