'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { AppUser } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

// Schema for when the user needs to add their section.
const sectionSchema = z.object({
  section: z.string().min(1, 'Section is required.'),
});

export function ProfileForm({ user }: { user: AppUser }) {
  const db = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // We only need the form if the section is missing.
  const form = useForm<z.infer<typeof sectionSchema>>({
    resolver: zodResolver(sectionSchema),
    defaultValues: {
      section: '',
    },
  });

  const handleSaveSection = async (values: z.infer<typeof sectionSchema>) => {
    if (!user || !db) {
      toast({ variant: 'destructive', title: 'Error', description: 'User or database not found.' });
      return;
    }

    setIsSubmitting(true);
    const userDocRef = doc(db, 'Users', user.uid);
    const updateData = { section: values.section.trim() };

    try {
      await updateDoc(userDocRef, updateData);
      toast({
        title: 'Success!',
        description: 'Your section has been saved.',
      });
      // The useUser hook will update the UI and re-render with the read-only view.
    } catch (error: any) {
      console.error('Error saving section:', error);
      if (error.name === 'FirebaseError' && error.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
          path: userDocRef.path,
          operation: 'update',
          requestResourceData: updateData,
        });
        errorEmitter.emit('permission-error', permissionError);
      } else {
        toast({
          variant: 'destructive',
          title: 'Update Failed',
          description: error.message || 'Could not save your section.',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={!user.section ? form.handleSubmit(handleSaveSection) : (e) => e.preventDefault()}
        className="space-y-8"
      >
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
          <FormItem>
            <FormLabel>Program</FormLabel>
            <div className="flex min-h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm opacity-50 cursor-not-allowed">
              <p className="break-words">{user.program || 'Not set'}</p>
            </div>
          </FormItem>

          {user.section ? (
            <FormItem>
              <FormLabel>Section</FormLabel>
              <div className="flex min-h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm opacity-50 cursor-not-allowed">
                <p className="break-words">{user.section}</p>
              </div>
            </FormItem>
          ) : (
            <FormField
              control={form.control}
              name="section"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Section</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 1BSCS1" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        {!user.section && (
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Section
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
}
