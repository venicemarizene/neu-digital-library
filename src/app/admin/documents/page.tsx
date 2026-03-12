import { PageHeader } from '@/components/layout/page-header';
import DocumentManager from './document-manager';

export default function AdminDocumentsPage() {
  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Document Management"
        description="Upload new documents and manage existing ones in the library."
      />
      <main className="flex-1 p-4 sm:p-6 md:p-8">
        <DocumentManager />
      </main>
    </div>
  );
}
