'use client';
import { useState, useEffect } from 'react';
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

  // It's critical that the caller memoizes this constraints array.
  // All current usages in the app are doing this correctly.
  const constraints = options?.constraints;

  useEffect(() => {
    if (options?.skip || !db) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const collectionRef = collection(db, path);
    // The query is created with the constraints.
    // The spread syntax is safe, as `constraints` will be undefined or an array.
    const q = query(collectionRef, ...(constraints ?? []));

    const handleSnapshot = (snapshot: DocumentData) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
      setData(docs);
      setError(null); // Clear previous errors on new data
      setLoading(false);
    };

    const handleError = (err: FirestoreError) => {
      setError(err);
      setLoading(false);
      console.error(`Error fetching collection '${path}':`, err);
    };

    let unsubscribe: () => void = () => {};

    if (options?.listen === false) {
      // One-time fetch
      getDocs(q)
        .then(handleSnapshot)
        .catch(handleError);
    } else {
      // Real-time listener
      unsubscribe = onSnapshot(q, handleSnapshot, handleError);
    }

    // Cleanup subscription on unmount
    return () => unsubscribe();
    // The dependency array includes the constraints array itself.
    // If the reference to this array changes, the effect will re-run.
  }, [db, path, constraints, options?.listen, options?.skip]);

  return { data, loading, error };
}
