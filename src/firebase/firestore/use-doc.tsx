'use client';
import { useState, useEffect } from 'react';
import {
  onSnapshot,
  doc,
  DocumentData,
  FirestoreError,
} from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface UseDocOptions {
  listen?: boolean;
}

export function useDoc<T>(path: string, options?: UseDocOptions) {
  const db = useFirestore();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }
    const docRef = doc(db, path);

    const handleSnapshot = (snapshot: DocumentData) => {
      if (snapshot.exists()) {
        setData({ id: snapshot.id, ...snapshot.data() } as T);
      } else {
        setData(null);
      }
      setLoading(false);
    };

    const handleError = (err: FirestoreError) => {
      setError(err);
      setLoading(false);
      const permissionError = new FirestorePermissionError({
        path: path,
        operation: 'get',
      });
      errorEmitter.emit('permission-error', permissionError);
    };

    if (options?.listen === false) {
      // One-time fetch not implemented, defaults to listener.
    }

    const unsubscribe = onSnapshot(docRef, handleSnapshot, handleError);
    return () => unsubscribe();
  }, [db, path, options?.listen]);

  return { data, loading, error };
}
