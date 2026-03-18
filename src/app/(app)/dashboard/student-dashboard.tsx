'use client';
import { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment, query, where, getDocs, getDoc as getFirestoreDoc } from 'firebase/firestore';
import { useUser, useFirestore } from '@/firebase';
import type { Document as DocumentType } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, Eye, Loader2, History, ArrowDownToLine } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

const RecentActivityCard = ({ title, description, icon, documents, loading, onDownload, onView, downloadingId, isBlocked }: { 
    title: string;
    description: string;
    icon: React.ReactNode;
    documents: DocumentType[];
    loading: boolean;
    onDownload: (doc: DocumentType) => void;
    onView: (doc: DocumentType) => void;
    downloadingId: string | null;
    isBlocked: boolean;
}) => {
    
    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-4 w-3/4 mt-2" />
                </CardHeader>
                <CardContent className="space-y-4">
                    {[...Array(2)].map((_, i) => (
                         <div key={i} className="flex items-center gap-4 p-2">
                            <Skeleton className="h-10 w-10 rounded-md" />
                            <div className="space-y-2 flex-1">
                                <Skeleton className="h-4 w-4/5" />
                                <Skeleton className="h-3 w-1/4" />
                            </div>
                            <div className="flex items-center gap-2">
                                <Skeleton className="h-9 w-20" />
                                <Skeleton className="h-9 w-24" />
                            </div>
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
                    <div className="grid gap-4">
                        {documents.map((doc) => (
                            <Card key={doc.id} className="flex flex-col sm:flex-row items-start gap-4 p-4 transition-all hover:shadow-md">
                                <div className="bg-primary/10 p-2 rounded-md mt-1">
                                    <FileText className="h-6 w-6 flex-shrink-0 text-primary" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-base">{doc.filename}</h4>
                                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{doc.category}</p>
                                </div>
                                <div className="flex items-center gap-2 mt-2 sm:mt-0 flex-shrink-0 self-start sm:self-center">
                                    <Button variant="outline" size="sm" onClick={() => onView(doc)} disabled={isBlocked}>
                                        <Eye className="mr-2 h-4 w-4" />
                                        View
                                    </Button>
                                    <Button size="sm" onClick={() => onDownload(doc)} disabled={downloadingId === doc.id || isBlocked}>
                                    {downloadingId === doc.id ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Download className="mr-2 h-4 w-4" />
                                    )}
                                    Download
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center rounded-lg bg-muted/50 py-10 text-center">
                        <p className="text-sm text-muted-foreground">No recent activity.</p>
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
    
    const [viewedDocs, setViewedDocs] = useState<DocumentType[]>([]);
    const [downloadedDocs, setDownloadedDocs] = useState<DocumentType[]>([]);
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
                const fetchDocsByAction = async (action: 'view' | 'download'): Promise<DocumentType[]> => {
                    const logsQuery = query(
                        collection(db, "Logs"),
                        where('userId', '==', user.uid),
                        where('action', '==', action)
                        // Note: orderBy and limit are removed to prevent needing a composite index,
                        // which can cause permission errors if not configured.
                        // Sorting and limiting are now handled on the client.
                    );
                    const logsSnapshot = await getDocs(logsQuery);
                    
                    if (logsSnapshot.empty) return [];
                    
                    // Sort logs on the client to find the most recent
                    const sortedLogs = logsSnapshot.docs
                        .map(d => d.data())
                        .sort((a, b) => {
                            const timeA = a.downloadedAt?.toMillis() || 0;
                            const timeB = b.downloadedAt?.toMillis() || 0;
                            return timeB - timeA;
                        });

                    // Get up to 5 unique document IDs from the sorted logs
                    const orderedUniqueDocIds: string[] = [];
                    const seenIds = new Set<string>();
                    for (const log of sortedLogs) {
                        const docId = log.documentId as string;
                        if (!seenIds.has(docId)) {
                            orderedUniqueDocIds.push(docId);
                            seenIds.add(docId);
                        }
                        if (orderedUniqueDocIds.length >= 5) break;
                    }


                    if (orderedUniqueDocIds.length === 0) return [];
                    
                    const docPromises = orderedUniqueDocIds.map(id => getFirestoreDoc(doc(db, "Documents", id)));
                    const docSnapshots = await Promise.all(docPromises);
                    
                    const docsById = new Map<string, DocumentType>();
                    docSnapshots.forEach(snap => {
                        if (snap.exists()) {
                            docsById.set(snap.id, { id: snap.id, ...snap.data() } as DocumentType);
                        }
                    });

                    // Return docs in the correct, recent order by mapping over the ordered ID list
                    return orderedUniqueDocIds
                        .map(id => docsById.get(id))
                        .filter((doc): doc is DocumentType => doc !== undefined);
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
