'use client';

import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (loading) {
      return; // Wait until user status is determined
    }

    if (!user) {
      // If there's no user, they should be at the admin login page.
      router.push('/admin/login');
    } else if (!isAdmin) {
      // If there is a user but they aren't an admin, send them away.
      router.push('/documents');
    }
  }, [user, isAdmin, loading, router]);
  
  // While loading, or if the user is not an admin (and the redirect is in flight),
  // show a loading screen to prevent content flashing.
  if (loading || !isAdmin) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // Only render the admin layout for authenticated admins.
  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
