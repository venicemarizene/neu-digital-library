import { PageHeader } from '@/components/layout/page-header';
import DocumentList from './document-list';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function DocumentsPage() {
  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title="Digital Library" description="Search and download documents." />
      <main className="flex-1 p-4 sm:p-6 md:p-8">
        <Suspense fallback={<Skeleton className="h-96 w-full rounded-lg" />}>
          <DocumentList />
        </Suspense>
      </main>
    </div>
  );
}
