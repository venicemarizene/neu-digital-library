'use client';
import { PageHeader } from '@/components/layout/page-header';
import StudentDashboard from './student-dashboard';
import { Suspense, useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/firebase';

export default function DashboardPage() {
  const { appUser } = useUser();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const welcomeMessage = isClient && appUser ? `Welcome back, ${appUser.displayName?.split(' ')[0]}!` : 'Welcome back!';
  
  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title="Student Dashboard" description={welcomeMessage} />
      <main className="flex-1 p-4 sm:p-6 md:p-8">
        <Suspense fallback={<Skeleton className="h-96 w-full rounded-lg" />}>
          <StudentDashboard />
        </Suspense>
      </main>
    </div>
  );
}
