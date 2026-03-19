'use client';

import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { useUser, useFirestore } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, appUser, loading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // This effect runs only on the client, after the component has mounted.
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Wait until the component has mounted and user loading is complete before running redirection logic.
    if (!isClient || loading) {
      return;
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
  }, [user, isAdmin, appUser, loading, router, db, isClient]);

  // On the server, and on the initial client render, `isClient` will be false,
  // and `loading` from `useUser` is initially true. This ensures we render the
  // loader consistently, avoiding a hydration mismatch.
  if (!isClient || loading || !user || !isAdmin) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // Only render the admin layout for authenticated admins once we're on the client
  // and all auth checks have passed.
  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset className="max-w-full overflow-x-hidden">{children}</SidebarInset>
    </SidebarProvider>
  );
}
