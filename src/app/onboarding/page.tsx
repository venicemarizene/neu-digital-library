'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const programs = [
  'Bachelor of Science in Information Technology (BSIT)',
  'Bachelor of Science in Computer Science (BSCS)',
  'Bachelor of Library and Information Science (BLIS)',
  'Associate in Computer Technology (ACT)',
];

export default function OnboardingPage() {
  const { user, loading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const [program, setProgram] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const handleSubmit = () => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Error', description: 'You are not logged in.' });
      router.push('/login');
      return;
    }
    if (!program) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select your program.' });
      return;
    }

    setIsSubmitting(true);
    const userDocRef = doc(db, 'Users', user.uid);
    const newUserData = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      program: program,
      isAdmin: false,
      isBlocked: false,
    };
    
    setDoc(userDocRef, newUserData)
      .then(() => {
        router.push('/documents');
      })
      .catch((error) => {
        console.error('Error during onboarding:', error);
        
        const permissionError = new FirestorePermissionError({
          path: userDocRef.path,
          operation: 'create',
          requestResourceData: newUserData,
        });
        errorEmitter.emit('permission-error', permissionError);

        toast({ 
          variant: 'destructive', 
          title: 'Onboarding Failed', 
          description: 'Could not save your profile. Please try again.' 
        });
        setIsSubmitting(false);
      });
  };

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Welcome to CICS!</CardTitle>
          <CardDescription>To personalize your experience, please select your undergraduate program.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <RadioGroup value={program} onValueChange={setProgram} className="space-y-2">
                {programs.map((p) => (
                  <div key={p} className="flex items-center space-x-2 rounded-md border border-border p-4 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:shadow-md">
                    <RadioGroupItem value={p} id={p} />
                    <Label htmlFor={p} className="flex-1 cursor-pointer text-sm">{p}</Label>
                  </div>
                ))}
            </RadioGroup>
            <Button onClick={handleSubmit} disabled={isSubmitting || !program} className="w-full">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isSubmitting ? 'Saving...' : 'Complete Profile'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
