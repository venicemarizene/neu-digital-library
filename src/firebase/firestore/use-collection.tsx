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

  const constraints = options?.constraints;
  // This is a common pattern to deep-compare an array of objects in a useEffect dependency array.
  // It ensures the effect only runs when the *content* of the constraints changes, not just the array reference.
  const constraintsJSON = JSON.stringify(constraints);

  useEffect(() => {
    if (options?.skip || !db) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const collectionRef = collection(db, path);
    // We still use the original constraints array to build the query.
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
    // We use the stringified constraints in the dependency array.
  }, [db, path, constraintsJSON, options?.listen, options?.skip]);

  return { data, loading, error };
}
