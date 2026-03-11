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
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        if (!firebaseUser.email?.endsWith('@neu.edu.ph')) {
          localStorage.setItem('authError', 'invalid-domain');
          signOut(auth);
          return;
        }
        setUser(firebaseUser);
      } else {
        setUser(null);
        setAppUser(null);
        setIsProfileComplete(null);
        setIsAdmin(false);
        setIsBlocked(false);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, [auth]);

  useEffect(() => {
    if (user) {
      const userDocRef = doc(db, 'Users', user.uid);
      const unsubscribeFirestore = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const userData = {
            uid: docSnap.id,
            ...docSnap.data(),
          } as AppUser;
          setAppUser(userData);
          setIsProfileComplete(!!userData.program);
          setIsAdmin(userData.isAdmin || false);
          setIsBlocked(userData.isBlocked || false);
        } else {
          setAppUser(null);
          setIsProfileComplete(false);
          setIsAdmin(false);
          setIsBlocked(false);
        }
        setLoading(false);
      });
      return () => unsubscribeFirestore();
    }
  }, [user, db]);

  return { user, appUser, loading, isProfileComplete, isAdmin, isBlocked };
};
