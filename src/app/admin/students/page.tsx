import { PageHeader } from '@/components/layout/page-header';
import StudentTable from './student-table';

export default function AdminStudentsPage() {
  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Manage Students"
        description="View all registered students, filter by program, and manage access."
      />
      <main className="flex-1 p-4 sm:p-6 md:p-8">
        <StudentTable />
      </main>
    </div>
  );
}
