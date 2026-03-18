'use client';
import { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment, query, where, getDocs } from 'firebase/firestore';
import { useUser, useFirestore } from '@/firebase';
import type { Document as DocumentType } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, Eye, Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { personalizedDocumentRecommendations, PersonalizedDocumentRecommendationsOutput } from '@/ai/flows/personalized-document-recommendations';

export default function StudentDashboard() {
    const { appUser, user, isBlocked } = useUser();
    const db = useFirestore();
    const { toast } = useToast();
    const [recommendations, setRecommendations] = useState<any[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState<string | null>(null);

    useEffect(() => {
        const getRecommendations = async () => {
            if (!appUser?.program || !user || !db) {
                setLoading(false);
                return;
            }

            try {
                // 1. Get AI recommendations
                const result = await personalizedDocumentRecommendations({ undergraduateProgram: appUser.program });
                
                let recsWithDocs: any[] = [];
                if (result.recommendations && result.recommendations.length > 0) {
                    const recommendedTitles = result.recommendations.map(r => r.title);
                    
                    // 2. Fetch all documents the student is allowed to see
                    const studentDocsQuery = query(collection(db, "Documents"), where('allowedStudentIds', 'array-contains', user.uid));
                    const docsSnapshot = await getDocs(studentDocsQuery);
                    const allowedDocs = docsSnapshot.docs.map(d => ({id: d.id, ...d.data()}) as DocumentType);
                    
                    // 3. Find the recommended docs within the allowed docs on the client
                    const matchingDocs = allowedDocs.filter(d => recommendedTitles.includes(d.filename));
                    
                    // 4. Map the AI description to the found Firestore documents
                    recsWithDocs = result.recommendations
                        .map(rec => {
                            const matchingDoc = matchingDocs.find(d => d.filename === rec.title);
                            if (matchingDoc) {
                                return {
                                    ...rec, // contains title and description from AI
                                    doc: matchingDoc // contains the full firestore document
                                };
                            }
                            return null;
                        })
                        .filter(Boolean) as any[];
                }
                setRecommendations(recsWithDocs);

            } catch (error) {
                console.error("Error getting AI recommendations:", error);
                setRecommendations([]); // Set to empty array on error
            } finally {
                setLoading(false);
            }
        };

        if (appUser) {
            getRecommendations();
        } else if (!user) {
            setLoading(false);
        }
    }, [appUser?.program, user, db]);
    
    const handleView = async (doc: DocumentType) => {
        if (isBlocked) {
            toast({ variant: 'destructive', title: 'Account Restricted', description: 'Your account is restricted from viewing files.' });
            return;
        }

        if (user && db) {
            try {
                await addDoc(collection(db, 'Logs'), {
                    userId: user.uid,
                    documentId: doc.id,
                    action: 'view',
                    downloadedAt: serverTimestamp(),
                });
            } catch (e) {
                console.error('Error logging view event', e);
            }
        }

        window.open(doc.downloadURL, '_blank');
    };

    const handleDownload = async (docToDownload: DocumentType) => {
        if (!user || !db) {
            toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in to download files.' });
            return;
        }
        if (isBlocked) {
            toast({ variant: 'destructive', title: 'Account Restricted', description: 'Your account is restricted from downloading files.' });
            return;
        }
        setDownloading(docToDownload.id);
        try {
            // Increment download count
            const docRef = doc(db, 'Documents', docToDownload.id);
            await updateDoc(docRef, { downloads: increment(1) });
            
            // Log the download action
            await addDoc(collection(db, 'Logs'), {
                userId: user.uid,
                documentId: docToDownload.id,
                action: 'download',
                downloadedAt: serverTimestamp(),
            });

            // Perform the download
            const response = await fetch(docToDownload.downloadURL);
            if (!response.ok) throw new Error('Network response was not ok.');
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', docToDownload.filename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            
        } catch (error) {
            console.error('Error downloading document:', error);
            toast({ variant: 'destructive', title: 'Download Failed', description: 'Could not download the file. Please try again.' });
        } finally {
            setDownloading(null);
        }
    };
    
    const renderSkeleton = () => (
        <Card>
            <CardHeader>
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-4 w-2/3 mt-2" />
            </CardHeader>
            <CardContent className="space-y-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-start gap-4 p-4 border rounded-lg">
                        <Skeleton className="h-8 w-8 mt-1 rounded-md" />
                        <div className="space-y-2 flex-1">
                            <Skeleton className="h-5 w-3/4" />
                            <Skeleton className="h-4 w-full" />
                        </div>
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-9 w-20" />
                            <Skeleton className="h-9 w-24" />
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );

    if (loading) {
        return renderSkeleton();
    }
    
    if (!appUser?.program) {
         return (
             <div className="flex flex-col items-center justify-center rounded-lg bg-card py-24 text-center shadow-md">
                <Sparkles className="h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">AI Recommendations</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                   Select your program in your profile to get personalized document recommendations.
                </p>
                <Button onClick={() => window.location.href = '/profile'} className="mt-4">Go to Profile</Button>
            </div>
        )
    }

    if (!recommendations || recommendations.length === 0) {
        return (
             <div className="flex flex-col items-center justify-center rounded-lg bg-card py-24 text-center shadow-md">
              <Sparkles className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No Recommendations For You</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                We couldn't find any specific document recommendations for your program right now.
              </p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
           <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-6 w-6 text-primary" />
                        Recommended For You
                    </CardTitle>
                    <CardDescription>Based on your program, here are some documents you might find helpful to get started.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4">
                        {recommendations.map((rec) => (
                            rec.doc ? (
                                <Card key={rec.doc.id} className="flex flex-col sm:flex-row items-start gap-4 p-4 transition-all hover:shadow-md">
                                    <div className="bg-primary/10 p-2 rounded-md mt-1">
                                        <FileText className="h-6 w-6 flex-shrink-0 text-primary" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-base">{rec.doc.filename}</h4>
                                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{rec.description}</p>
                                    </div>
                                    <div className="flex items-center gap-2 mt-2 sm:mt-0 flex-shrink-0 self-start sm:self-center">
                                        <Button variant="outline" size="sm" onClick={() => handleView(rec.doc)} disabled={isBlocked}>
                                            <Eye className="mr-2 h-4 w-4" />
                                            View
                                        </Button>
                                        <Button size="sm" onClick={() => handleDownload(rec.doc)} disabled={downloading === rec.doc.id || isBlocked}>
                                        {downloading === rec.doc.id ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <Download className="mr-2 h-4 w-4" />
                                        )}
                                        Download
                                        </Button>
                                    </div>
                                </Card>
                            ) : null
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
