import { PageHeader } from '@/components/layout/page-header';
import ArchiveManager from './archive-manager';

export default function AdminArchivePage() {
  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Archived Documents"
        description="Manage and restore documents that have been archived."
      />
      <main className="flex-1 p-4 sm:p-6 md:p-8">
        <ArchiveManager />
      </main>
    </div>
  );
}
