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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Image from 'next/image';
import { ThemeToggle } from '@/components/theme-toggle';

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 48 48" {...props}>
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C43.021,36.251,44,30.651,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
    </svg>
);

const ADMIN_EMAIL = 'venicemarizene.linga@neu.edu.ph';

export default function LoginPage() {
  const { user, isAdmin, loading: userLoading } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [activeTab, setActiveTab] = useState('student');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);


  useEffect(() => {
    // If a user is already logged in and somehow lands here, redirect them.
    // Ensure this only runs on the client after hydration
    if (isClient && !userLoading && user) {
        if (isAdmin) {
            router.push('/admin');
        } else {
            router.push('/');
        }
    }
  }, [user, isAdmin, userLoading, router, isClient]);

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

            // An admin can be defined by the isAdmin field in their user document
            // OR by having the hardcoded admin email address.
            // This check is necessary to allow the first-time login of the hardcoded admin,
            // as their user document won't exist yet.
            const isHardcodedAdmin = loggedInUser.email === ADMIN_EMAIL;
            const isDbAdmin = userDoc.exists() && userDoc.data().isAdmin === true;

            if (isHardcodedAdmin || isDbAdmin) {
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

  // On server, and on initial client render, `isClient` is false, so we render the loader.
  // We also render loader if auth state is loading, or if a user is logged in (and will be redirected).
  // This prevents a flash of the login page for logged-in users.
  if (!isClient || loading || user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background dark:bg-background">
        <header className="bg-secondary dark:bg-sidebar/70 text-foreground p-4 flex justify-between items-center border-b border-border shadow-md dark:shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
            <div className="flex items-center gap-3">
                 <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full overflow-hidden bg-white">
                    <Image
                        src="/NEU_LOGO.png"
                        alt="New Era University"
                        width={50}
                        height={50}
                        className="object-cover w-full h-full"
                    />
                </div>
                <span className="text-xl font-semibold text-[#a8872a] dark:text-primary font-playfair">New Era University</span>
            </div>
            <div className="flex items-center gap-4">
                <ThemeToggle />
            </div>
        </header>

        <main className="flex flex-1 w-full flex-col items-center justify-center p-4">
            <Card className="w-full max-w-[420px] shadow-2xl rounded-xl dark:border dark:border-border">
                <CardContent className="p-12 flex flex-col items-center gap-8">
                    <div className="text-center space-y-2">
                        <div className="mx-auto flex h-[72px] w-[72px] items-center justify-center rounded-full bg-white overflow-hidden mb-4">
                             <Image
                                src="/NEU_LOGO.png"
                                alt="New Era University"
                                width={72}
                                height={72}
                                className="object-cover"
                            />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            <span className="text-accent">CICS</span>
                            <span className="text-primary"> DocHub</span>
                        </h1>
                        <p className="text-muted-foreground text-sm">Digital Library for CICS Students & Faculty</p>
                    </div>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 h-12 rounded-xl">
                            <TabsTrigger value="student" className="h-full text-base gap-2 rounded-lg data-[state=inactive]:dark:text-muted-foreground">
                                <User className="h-5 w-5" />
                                Student
                            </TabsTrigger>
                            <TabsTrigger value="admin" className="h-full text-base gap-2 rounded-lg data-[state=inactive]:dark:text-muted-foreground">
                                <ShieldCheck className="h-5 w-5" />
                                Admin
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>

                    <div className="w-full space-y-2">
                        <Button onClick={handleSignIn} className="w-full h-12 text-base rounded-xl bg-primary text-primary-foreground hover:bg-primary/90" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <GoogleIcon className="mr-2 h-6 w-6" />}
                            {loading ? "Verifying..." : "Sign in with Google"}
                        </Button>
                        <p className="px-4 text-center text-xs text-muted-foreground">
                            An institutional @neu.edu.ph account is required.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </main>
        
        <footer className="bg-secondary dark:bg-sidebar/70 text-muted-foreground p-4 text-center text-xs border-t border-border shadow-[0_-2px_6px_rgba(0,0,0,0.08)]">
            <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-1">
                <span>© 2026 New Era University</span>
                <span className="hidden sm:inline text-muted-foreground/50">•</span>
                <span>College of Informatics and Computing Science</span>
            </div>
        </footer>
    </div>
  );
}
