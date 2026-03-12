'use client';

import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useAuth, useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 48 48" {...props}>
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C43.021,36.251,44,30.651,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
    </svg>
);


export default function AdminLoginPage() {
  const { user, isAdmin, loading: userLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    // This effect will run when the user's auth state changes.
    // If the user is logged in and is an admin, it redirects to the admin dashboard.
    // If they are not an admin, it sends them to the student dashboard.
    if (!userLoading && user) {
        if (isAdmin) {
            router.push('/admin');
        } else {
            // A non-admin user trying to log in via the admin page.
            // Let's show a toast and send them to the student dashboard.
             toast({
                variant: 'destructive',
                title: 'Access Denied',
                description: "You do not have administrative privileges.",
            });
            router.push('/documents');
        }
    }
  }, [user, isAdmin, userLoading, router, toast]);

  const handleSignIn = async () => {
    if (!auth) return;
    setIsSigningIn(true);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      hd: 'neu.edu.ph',
      prompt: 'select_account'
    });

    try {
        await signInWithPopup(auth, provider);
        // On success, the useUser hook will update, and the useEffect above
        // will handle navigation.
    } catch (error: any) {
        let description = 'An unexpected error occurred during sign-in.';
        
        switch (error.code) {
            case 'auth/popup-closed-by-user':
                setIsSigningIn(false);
                return; // Don't show toast
            case 'auth/unauthorized-domain':
                description = "This application's domain is not authorized for Google Sign-In. An administrator needs to add this domain to the Firebase console's list of authorized domains.";
                break;
            case 'auth/operation-not-allowed':
                 description = "Access restricted. Please use an 'neu.edu.ph' email account.";
                 break;
            case 'auth/popup-blocked':
                description = "Popup blocked by browser. Please allow popups for this site to sign in.";
                break;
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

  // Show a loader while checking auth state or if the user is already logged in and being redirected.
  if (userLoading || (!userLoading && user)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm shadow-xl">
        <CardHeader className="text-center items-center">
            <div className="rounded-full bg-primary/10 p-3">
                <ShieldCheck className="h-10 w-10 text-primary" />
            </div>
          <CardTitle className="font-headline text-2xl">CICS Admin Portal</CardTitle>
          <CardDescription>Administrator login required</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
           <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">
                    Sign in with your institutional account
                    </span>
                </div>
            </div>
          <Button onClick={handleSignIn} className="w-full" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon className="mr-2 h-5 w-5" />}
            {loading ? "Signing in..." : "Sign in with Google"}
          </Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Only authorized administrators can access this portal.
          </p>
            <Link href="/login" className="text-center text-sm text-muted-foreground hover:text-primary underline">
                Not an admin? Go to Student Login
            </Link>
        </CardContent>
      </Card>
    </main>
  );
}
