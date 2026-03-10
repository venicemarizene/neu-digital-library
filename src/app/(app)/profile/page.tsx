import { PageHeader } from '@/components/layout/page-header';
import ProfileClient from './profile-client';

export default function ProfilePage() {
  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title="My Profile" description="View and update your profile information." />
      <main className="flex-1 p-4 sm:p-6 md:p-8">
        <ProfileClient />
      </main>
    </div>
  );
}
