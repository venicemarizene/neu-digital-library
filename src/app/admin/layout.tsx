'use client';

import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { useUser, useFirestore } from '@/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, appUser, loading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) {
      return; // Wait until user status is determined
    }

    if (!user) {
      // If there's no user, they should be at the main login page.
      router.push('/login');
    } else if (!isAdmin) {
      // If there is a user but they aren't an admin, send them away.
      router.push('/documents');
    } else if (isAdmin && !appUser && user && db) {
      // This is a new admin. Create their profile silently.
      const userDocRef = doc(db, 'Users', user.uid);
      const newAdminData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        program: 'Administrator',
        isAdmin: true,
        isBlocked: false,
        onboardingComplete: true,
        createdAt: serverTimestamp(),
      };
      // Set the doc but don't wait for it. The useUser hook will pick up the change.
      setDoc(userDocRef, newAdminData, { merge: true });
    }
  }, [user, isAdmin, appUser, loading, router, db]);

  // If a user is not an admin, the useEffect above will redirect them.
  // We show a loader while that check is happening.
  if (loading || !user || !isAdmin) {
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
