'use client';
import { useState, useEffect, useMemo } from 'react';
import {
  onSnapshot,
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  Query,
  DocumentData,
  FirestoreError,
  QueryConstraint,
} from 'firebase/firestore';
import { useFirestore } from '@/firebase';

interface UseCollectionOptions {
  constraints?: QueryConstraint[];
  listen?: boolean;
  skip?: boolean;
}

export function useCollection<T>(
  path: string,
  options?: UseCollectionOptions
) {
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
      const docs = snapshot.docs.map(
        (doc: DocumentData) => ({ id: doc.id, ...doc.data() } as T)
      );
      setData(docs);
      setLoading(false);
    };

    const handleError = (err: FirestoreError) => {
      setError(err);
      setLoading(false);
      console.error(err);
    };

    if (options?.listen === false) {
        // One-time fetch is not implemented, defaults to listener.
    }

    const unsubscribe = onSnapshot(q, handleSnapshot, handleError);
    return () => unsubscribe();
  }, [db, path, memoizedConstraints, options?.listen, options?.skip]);

  return { data, loading, error };
}
