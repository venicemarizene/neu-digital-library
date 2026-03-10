'use client';
import { useUser } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ProfileForm } from './profile-form';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProfileClient() {
  const { appUser, loading } = useUser();

  if (loading || !appUser) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <Skeleton className="h-8 w-1/4" />
          <Skeleton className="h-4 w-1/2 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-32" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Profile Details</CardTitle>
        <CardDescription>Manage your personal and academic information.</CardDescription>
      </CardHeader>
      <CardContent>
        <ProfileForm user={appUser} />
      </CardContent>
    </Card>
  );
}
