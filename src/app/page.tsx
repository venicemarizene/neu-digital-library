'use client';

import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const { user, loading, isProfileComplete, isAdmin, isBlocked } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (isBlocked) {
        router.push('/restricted');
      } else if (!isProfileComplete) {
        router.push('/onboarding');
      } else if (isAdmin) {
        router.push('/admin/analytics');
      } else {
        router.push('/dashboard');
      }
    }
  }, [user, loading, isProfileComplete, isAdmin, isBlocked, router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );
}
