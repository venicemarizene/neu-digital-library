'use client';

import { useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Ban } from 'lucide-react';

export default function RestrictedPage() {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Sign the user out as soon as they land on this page.
    signOut(auth);
  }, [auth]);

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <Ban className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle>Account Restricted</CardTitle>
          <CardDescription>
            Your access to CICS DocHub has been restricted by an administrator.
            Please contact support if you believe this is an error.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => router.push('/login')} className="w-full">
            Return to Login
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
