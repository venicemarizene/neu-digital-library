'use client';
import { PageHeader } from '@/components/layout/page-header';
import DocumentList from './document-list';
import { Suspense, useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/firebase';

export default function DocumentsPage() {
  const { appUser, loading } = useUser();
  const [description, setDescription] = useState("Search and download documents.");
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // This ensures that any logic that depends on the client environment
    // runs only after the component has mounted.
    setIsClient(true);
  }, []);

  useEffect(() => {
    // This effect updates the description on the client-side once user data is available,
    // preventing a hydration mismatch between the server-rendered and client-rendered output.
    if (isClient && appUser?.program) {
      const acronymMatch = appUser.program.match(/\(([^)]+)\)/);
      if (acronymMatch) {
        setDescription(`Resources for ${acronymMatch[1]} students.`);
      } else {
        // Fallback for programs without acronyms
        setDescription(`Resources for ${appUser.program} students.`);
      }
    }
  }, [isClient, appUser]);


  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title="Digital Library" description={description} />
      <main className="flex-1 p-4 sm:p-6 md:p-8">
        <Suspense fallback={<Skeleton className="h-96 w-full rounded-lg" />}>
          <DocumentList />
        </Suspense>
      </main>
    </div>
  );
}
