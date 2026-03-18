'use client';

import type { AppUser } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ProfileForm({ user }: { user: AppUser }) {
  return (
    <form onSubmit={(e) => e.preventDefault()} className="space-y-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="displayName">Display Name</Label>
          <Input id="displayName" disabled value={user.displayName || 'N/A'} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input id="email" disabled value={user.email || 'N/A'} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Program</Label>
        <div className="flex min-h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm opacity-50 cursor-not-allowed">
          <p className="break-words">{user.program || 'Not set'}</p>
        </div>
      </div>
    </form>
  );
}
