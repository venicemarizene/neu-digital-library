'use client';

import { GoogleAuthProvider, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { useAuth, useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/icons/logo';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 48 48" {...props}>
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C43.021,36.251,44,30.651,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
    </svg>
);


export default function LoginPage() {
  const { user, loading: userLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSigningIn, setIsSigningIn] = useState(true); // Start as true to handle redirect result

  useEffect(() => {
    if (!userLoading && user) {
      router.push('/');
    }
  }, [user, userLoading, router]);

  // Handle redirect result
  useEffect(() => {
    if (auth) {
      getRedirectResult(auth)
        .then((result) => {
          // If result is null, it means no redirect operation was pending.
          // If there is a result, the useUser hook will pick up the new user state.
        })
        .catch((error) => {
          console.error('Error getting redirect result: ', error);
          let description = 'An unexpected error occurred. Please try again.';
          if (error.code === 'auth/account-exists-with-different-credential') {
            description = 'An account already exists with the same email address but different sign-in credentials.';
          } else if (error.message.includes("hd parameter")) {
            description = "Access restricted. Please use an 'neu.edu.ph' email account.";
          } else if (error.code === 'auth/unauthorized-domain') {
            description = "This app's domain is not authorized for authentication. Please contact an administrator.";
          }
          
          toast({
            variant: "destructive",
            title: "Authentication Failed",
            description: description,
          });
        })
        .finally(() => {
            setIsSigningIn(false);
        });
    }
  }, [auth, toast]);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      hd: 'neu.edu.ph',
      prompt: 'select_account'
    });
    try {
        await signInWithRedirect(auth, provider);
    } catch (error: any) {
        console.error("Sign-in failed to initiate:", error);
        let description = "Could not start the sign-in process. Please try again.";
        if (error.code === 'auth/unauthorized-domain') {
            description = "This application's domain is not authorized for Google Sign-In. An administrator needs to add this domain to the Firebase console's list of authorized domains.";
        }
        toast({
            variant: 'destructive',
            title: 'Authentication Error',
            description: description,
        });
        setIsSigningIn(false);
    }
  };
  
  const loading = userLoading || isSigningIn;

  if (loading || (!userLoading && user)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex justify-center">
            <Logo />
          </div>
          <CardTitle>Welcome</CardTitle>
          <CardDescription>Sign in to access the CICS document vault.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleSignIn} className="w-full" variant="outline" disabled={isSigningIn}>
            <GoogleIcon className="mr-2 h-5 w-5" />
            Sign in with Google
          </Button>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Use your @neu.edu.ph account to continue.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
