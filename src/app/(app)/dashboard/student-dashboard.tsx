'use client';
import { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment, query, where, getDocs, getDoc, Timestamp } from 'firebase/firestore';
import { useUser, useFirestore } from '@/firebase';
import type { Document as DocumentType } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, Eye, Loader2, History, ArrowDownToLine, LibraryBig } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

type ActivityDoc = DocumentType & { activityTimestamp: Timestamp };

const RecentActivityCard = ({ title, description, icon, documents, loading, onDownload, onView, downloadingId, isBlocked }: { 
    title: string;
    description: string;
    icon: React.ReactNode;
    documents: ActivityDoc[];
    loading: boolean;
    onDownload: (doc: DocumentType) => void;
    onView: (doc: DocumentType) => void;
    downloadingId: string | null;
    isBlocked: boolean;
}) => {
    const router = useRouter();

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-4 w-3/4 mt-2" />
                </CardHeader>
                <CardContent className="flex space-x-4 overflow-hidden">
                    {[...Array(4)].map((_, i) => (
                         <div key={i} className="min-w-0 basis-1/2 md:basis-1/3 lg:basis-1/4 p-1">
                            <Skeleton className="h-48 w-full rounded-lg" />
                        </div>
                    ))}
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    {icon}
                    {title}
                </CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                 {documents.length > 0 ? (
                    <Carousel opts={{ align: "start", dragFree: true }} className="w-full">
                        <CarouselContent className="-ml-2">
                            {documents.map((doc) => (
                                <CarouselItem key={doc.id} className="basis-[75%] sm:basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5 pl-2">
                                    <div className="p-1 h-full">
                                        <Card className="h-full group flex flex-col overflow-hidden transition-all hover:shadow-lg cursor-pointer" onClick={() => onView(doc)}>
                                            <CardContent className="p-3 flex flex-col items-start gap-3 flex-1">
                                                <div className="flex w-full items-start justify-between gap-2">
                                                    <div className="bg-primary/10 p-2 rounded-md transition-colors group-hover:bg-primary/20">
                                                        <FileText className="h-5 w-5 text-primary" />
                                                    </div>
                                                    <Badge variant="outline" className="flex-shrink-0">{doc.category}</Badge>
                                                </div>
                                                <div className="space-y-1 flex-1 self-stretch">
                                                    <p className="font-semibold text-sm leading-snug line-clamp-2" title={doc.filename}>{doc.filename}</p>
                                                </div>
                                                <div className="w-full mt-auto space-y-2">
                                                    <p className="text-xs text-muted-foreground">
                                                        {doc.activityTimestamp ? format(doc.activityTimestamp.toDate(), 'MMM d, yyyy') : 'N/A'}
                                                    </p>
                                                    <Button 
                                                        size="sm" 
                                                        className="w-full" 
                                                        onClick={(e) => { e.stopPropagation(); onDownload(doc); }} 
                                                        disabled={downloadingId === doc.id || isBlocked}
                                                    >
                                                        {downloadingId === doc.id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Download className="mr-2 h-4 w-4" />
                                                        )}
                                                        Download
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                        <CarouselPrevious className="absolute left-[-1rem] top-1/2 -translate-y-1/2 hidden sm:flex" />
                        <CarouselNext className="absolute right-[-1rem] top-1/2 -translate-y-1/2 hidden sm:flex" />
                    </Carousel>
                ) : (
                    <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed bg-card py-12 text-center">
                        <div className="rounded-full bg-muted p-4">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10 text-muted-foreground"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="m10 10-4 4 4 4"/><path d="m14 18 4-4-4-4"/></svg>
                        </div>
                        <h3 className="mt-6 text-lg font-semibold">No recent activity</h3>
                        <p className="mt-2 text-sm text-muted-foreground">
                            View or download documents from the library to see them here.
                        </p>
                        <Button className="mt-6" onClick={() => router.push('/documents')}>
                            <LibraryBig className="mr-2 h-4 w-4" />
                            Go to Library
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};


export default function StudentDashboard() {
    const { user, isBlocked } = useUser();
    const db = useFirestore();
    const { toast } = useToast();
    
    const [viewedDocs, setViewedDocs] = useState<ActivityDoc[]>([]);
    const [downloadedDocs, setDownloadedDocs] = useState<ActivityDoc[]>([]);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState<string | null>(null);

    useEffect(() => {
        const fetchRecentActivity = async () => {
            if (!user?.uid || !db) {
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                // Generic function to fetch logs and associated documents
                const fetchDocsByAction = async (action: 'view' | 'download'): Promise<ActivityDoc[]> => {
                    const logsQuery = query(
                        collection(db, "Logs"),
                        where('userId', '==', user.uid),
                        where('action', '==', action)
                    );
                    const logsSnapshot = await getDocs(logsQuery);
                    
                    if (logsSnapshot.empty) return [];
                    
                    const sortedLogs = logsSnapshot.docs
                        .map(d => d.data())
                        .sort((a, b) => (b.downloadedAt?.toMillis() || 0) - (a.downloadedAt?.toMillis() || 0));

                    const docIdToLogMap = new Map<string, any>();
                    for (const log of sortedLogs) {
                        if (log.documentId && !docIdToLogMap.has(log.documentId)) {
                            docIdToLogMap.set(log.documentId, log);
                        }
                    }

                    const latestLogs = Array.from(docIdToLogMap.values())
                        .sort((a, b) => (b.downloadedAt?.toMillis() || 0) - (a.downloadedAt?.toMillis() || 0))
                        .slice(0, 10); // Fetch up to 10 recent items

                    if (latestLogs.length === 0) return [];

                    const docIds = latestLogs.map(log => log.documentId);
                    const docPromises = docIds.map(id => getDoc(doc(db, "Documents", id)));
                    const docSnapshots = await Promise.all(docPromises);
                    
                    const docsById = new Map<string, DocumentType>();
                    docSnapshots.forEach(snap => {
                        if (snap.exists()) {
                            docsById.set(snap.id, { id: snap.id, ...snap.data() } as DocumentType);
                        }
                    });

                    return latestLogs
                        .map(log => {
                            const doc = docsById.get(log.documentId);
                            if (doc) {
                                return { ...doc, activityTimestamp: log.downloadedAt };
                            }
                            return undefined;
                        })
                        .filter((d): d is ActivityDoc => d !== undefined);
                };

                const [recentViews, recentDownloads] = await Promise.all([
                    fetchDocsByAction('view'),
                    fetchDocsByAction('download')
                ]);

                setViewedDocs(recentViews);
                setDownloadedDocs(recentDownloads);

            } catch (error) {
                console.error("Error fetching recent activity:", error);
                // Fail silently, the UI will just show "no recent activity"
            } finally {
                setLoading(false);
            }
        };

        if (user?.uid && db) {
            fetchRecentActivity();
        } else if (!user?.uid) {
            setLoading(false);
        }
    }, [user?.uid, db]);
    
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
    
    return (
        <div className="space-y-6">
            <RecentActivityCard
                title="Recently Viewed"
                description="Documents you've recently opened."
                icon={<History className="h-6 w-6 text-primary" />}
                documents={viewedDocs}
                loading={loading}
                onView={handleView}
                onDownload={handleDownload}
                downloadingId={downloading}
                isBlocked={isBlocked ?? false}
            />
            <RecentActivityCard
                title="Recently Downloaded"
                description="Documents you've recently saved."
                icon={<ArrowDownToLine className="h-6 w-6 text-primary" />}
                documents={downloadedDocs}
                loading={loading}
                onView={handleView}
                onDownload={handleDownload}
                downloadingId={downloading}
                isBlocked={isBlocked ?? false}
            />
        </div>
    );
}
