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
});

export function ProfileForm({ user }: { user: AppUser }) {
  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      program: user.program || 'Not set',
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
        <FormField
          control={form.control}
          name="program"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Program</FormLabel>
                <FormControl>
                    <Input {...field} disabled />
                </FormControl>
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}
