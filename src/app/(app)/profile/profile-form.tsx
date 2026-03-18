'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { AppUser } from '@/lib/types';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';

const profileSchema = z.object({
  program: z.string(),
  section: z.string(),
});

export function ProfileForm({ user }: { user: AppUser }) {
  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      program: user.program || 'Not set',
      section: user.section || 'Not set',
    },
  });

  return (
    <Form {...form}>
      <form className="space-y-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormItem>
            <FormLabel>Display Name</FormLabel>
            <FormControl>
              <Input disabled value={user.displayName || 'N/A'} />
            </FormControl>
          </FormItem>
          <FormItem>
            <FormLabel>Email Address</FormLabel>
            <FormControl>
              <Input disabled value={user.email || 'N/A'} />
            </FormControl>
          </FormItem>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
            control={form.control}
            name="program"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Program</FormLabel>
                    <FormControl>
                        <div className="flex min-h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm opacity-50 cursor-not-allowed">
                            <p className="break-words">{field.value}</p>
                        </div>
                    </FormControl>
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="section"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Section</FormLabel>
                    <FormControl>
                        <div className="flex min-h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm opacity-50 cursor-not-allowed">
                            <p className="break-words">{field.value}</p>
                        </div>
                    </FormControl>
                </FormItem>
            )}
            />
        </div>
      </form>
    </Form>
  );
}
