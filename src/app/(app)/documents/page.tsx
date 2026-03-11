'use client';
import { PageHeader } from '@/components/layout/page-header';
import DocumentList from './document-list';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/firebase';

export default function DocumentsPage() {
  const { appUser } = useUser();

  let description = "Search and download documents.";
  if (appUser?.program) {
    const acronymMatch = appUser.program.match(/\(([^)]+)\)/);
    if (acronymMatch) {
      description = `Resources for ${acronymMatch[1]} students.`;
    }
  }


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
