'use client';
import { useState, useEffect, useMemo } from 'react';
import {
  onSnapshot,
  getDocs,
  collection,
  query,
  QueryConstraint,
  FirestoreError,
  DocumentData,
} from 'firebase/firestore';
import { useFirestore } from '@/firebase';

interface UseCollectionOptions {
  constraints?: QueryConstraint[];
  listen?: boolean; // default true
  skip?: boolean;
}

export function useCollection<T>(path: string, options?: UseCollectionOptions) {
  const db = useFirestore();
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);

  const memoizedConstraints = useMemo(() => options?.constraints ?? [], [options?.constraints]);

  useEffect(() => {
    if (options?.skip || !db) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const collectionRef = collection(db, path);
    const q = query(collectionRef, ...memoizedConstraints);

    const handleSnapshot = (snapshot: DocumentData) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
      setData(docs);
      setLoading(false);
    };

    const handleError = (err: FirestoreError) => {
      setError(err);
      setLoading(false);
      console.error(err);
    };

    let unsubscribe: () => void = () => {};

    if (options?.listen === false) {
      // One-time fetch
      getDocs(q)
        .then(handleSnapshot)
        .catch(handleError);
    } else {
      unsubscribe = onSnapshot(q, handleSnapshot, handleError);
    }

    return () => unsubscribe();
  }, [db, path, memoizedConstraints, options?.listen, options?.skip]);

  return { data, loading, error };
}