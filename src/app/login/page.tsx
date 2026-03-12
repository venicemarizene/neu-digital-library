'use client';

import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, User, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/icons/logo';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 48 48" {...props}>
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C43.021,36.251,44,30.651,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
    </svg>
);


export default function LoginPage() {
  const { user, isAdmin, loading: userLoading } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [activeTab, setActiveTab] = useState('student');

  useEffect(() => {
    // If a user is already logged in and somehow lands here, redirect them.
    if (!userLoading && user) {
        if (isAdmin) {
            router.push('/admin');
        } else {
            router.push('/');
        }
    }
  }, [user, isAdmin, userLoading, router]);

  const handleSignIn = async () => {
    if (!auth || !db) return;
    setIsSigningIn(true);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      hd: 'neu.edu.ph',
      prompt: 'select_account'
    });

    try {
        const result = await signInWithPopup(auth, provider);
        const loggedInUser = result.user;
        
        if (activeTab === 'admin') {
            const userDocRef = doc(db, 'Users', loggedInUser.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists() && userDoc.data().isAdmin === true) {
                router.push('/admin'); // Imperative redirect for admin
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Access Denied',
                    description: "You do not have administrative privileges.",
                });
                await signOut(auth);
                setIsSigningIn(false);
            }
        } else { // Student login
             router.push('/'); // Redirect to root, which will handle onboarding or dashboard
        }

    } catch (error: any) {
        let description = 'An unexpected error occurred during sign-in.';
        
        if (error.code !== 'auth/popup-closed-by-user') {
            switch (error.code) {
                case 'auth/unauthorized-domain':
                    description = "This app's domain isn't authorized. Contact an admin.";
                    break;
                case 'auth/operation-not-allowed':
                    description = "Access restricted. Please use an '@neu.edu.ph' email.";
                    break;
                case 'auth/popup-blocked':
                    description = "Popup blocked. Please allow popups for this site.";
                    break;
                default:
                    console.error("Authentication error:", error);
                    break;
            }
            toast({
                variant: 'destructive',
                title: 'Authentication Error',
                description: description,
            });
        }
        setIsSigningIn(false);
    }
  };
  
  const loading = userLoading || isSigningIn;

  // Render a loader if authentication is in progress or if a logged-in user is being redirected.
  if (userLoading || (!userLoading && user)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4 space-y-8">
        <div className="text-center space-y-2">
            <Logo className="justify-center" />
            <p className="text-muted-foreground text-sm max-w-xs mx-auto">Digital Repository for College of Informatics and Computing Science</p>
        </div>

        <Card className="w-full max-w-sm shadow-xl p-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="student">
                        <User className="mr-2" />
                        Student
                    </TabsTrigger>
                    <TabsTrigger value="admin">
                        <ShieldCheck className="mr-2" />
                        Admin
                    </TabsTrigger>
                </TabsList>
            </Tabs>

            <CardContent className="pt-6 flex flex-col gap-4">
                <Button onClick={handleSignIn} className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon className="mr-2 h-5 w-5" />}
                    {loading ? "Verifying..." : "Sign in with Google"}
                </Button>
                <p className="px-4 text-center text-xs text-muted-foreground">
                    Institutional @neu.edu.ph domain enforced.
                </p>
            </CardContent>
        </Card>
    </main>
  );
}
