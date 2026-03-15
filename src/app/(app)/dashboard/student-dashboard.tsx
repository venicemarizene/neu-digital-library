'use client';
import { useState, useMemo, useEffect } from 'react';
import { collection, query, where, orderBy, limit, getDocs, documentId, Timestamp, addDoc, serverTimestamp } from 'firebase/firestore';
import { useUser, useFirestore, useCollection } from '@/firebase';
import type { Document as DocumentType, DownloadLog } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, Eye, Loader2, History } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

export default function StudentDashboard() {
    const { user, isBlocked } = useUser();
    const db = useFirestore();
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState<'view' | 'download'>('view');
    const [documents, setDocuments] = useState<DocumentType[]>([]);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState<string | null>(null);

    const logConstraints = useMemo(() => {
        if (!user) return [];
        return [
            where('userId', '==', user.uid),
            where('action', '==', activeTab),
            orderBy('downloadedAt', 'desc'),
            limit(12)
        ];
    }, [user, activeTab]);

    const { data: logs, loading: loadingLogs } = useCollection<DownloadLog>('Logs', { 
        constraints: logConstraints, 
        listen: true, 
        skip: !user 
    });

    useEffect(() => {
        const fetchDocuments = async () => {
            if (!logs || !db) {
                if (!loadingLogs) {
                    setDocuments([]);
                    setLoading(false);
                }
                return;
            }
            if (logs.length === 0) {
                setDocuments([]);
                setLoading(false);
                return;
            }

            setLoading(true);
            const docIds = [...new Set(logs.map(log => log.documentId))];
            
            let fetchedDocs: DocumentType[] = [];

            if (docIds.length > 0) {
                try {
                    const docsQuery = query(collection(db, 'Documents'), where(documentId(), 'in', docIds));
                    const docSnapshots = await getDocs(docsQuery);
                    fetchedDocs = docSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() } as DocumentType));
                } catch (error) {
                    console.error("Error fetching documents by IDs:", error);
                }
            }
            
            const docsMap = new Map(fetchedDocs.map(doc => [doc.id, doc]));

            const sortedDocs = logs
                .map(log => docsMap.get(log.documentId))
                .filter((doc): doc is DocumentType => !!doc);
                
            const uniqueSortedDocs = Array.from(new Map(sortedDocs.map(doc => [doc.id, doc])).values());

            setDocuments(uniqueSortedDocs);
            setLoading(false);
        };

        fetchDocuments();
    }, [logs, db, loadingLogs]);
    
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

    const handleDownload = async (doc: DocumentType) => {
        if (!user) {
            toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in to download files.' });
            return;
        }
        if (isBlocked) {
            toast({ variant: 'destructive', title: 'Account Restricted', description: 'Your account is restricted from downloading files.' });
            return;
        }
        setDownloading(doc.id);
        try {
            await addDoc(collection(db, 'Logs'), {
                userId: user.uid,
                documentId: doc.id,
                action: 'download',
                downloadedAt: serverTimestamp(),
            });

            const response = await fetch(doc.downloadURL);
            if (!response.ok) throw new Error('Network response was not ok.');
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', doc.filename);
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
    
    const renderDocGrid = (docs: DocumentType[]) => (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {docs.map((doc) => (
            <Card key={doc.id} className="flex flex-col transition-all hover:shadow-lg">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 p-2 rounded-md">
                    <FileText className="h-6 w-6 flex-shrink-0 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="line-clamp-2 text-base font-headline">{doc.filename}</CardTitle>
                    <CardDescription>{doc.category}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardFooter className="flex items-center gap-2 mt-auto">
                    <Button variant="outline" size="sm" onClick={() => handleView(doc)} disabled={isBlocked}>
                        <Eye className="mr-2 h-4 w-4" />
                        View
                    </Button>
                    <Button size="sm" onClick={() => handleDownload(doc)} disabled={downloading === doc.id || isBlocked}>
                    {downloading === doc.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Download className="mr-2 h-4 w-4" />
                    )}
                    {downloading === doc.id ? 'Downloading' : 'Download'}
                    </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
    );
    
    if (loading || loadingLogs) {
        return (
             <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <Card key={i}>
                    <CardHeader className="flex-row items-start gap-4">
                        <Skeleton className="h-10 w-10 rounded-md" />
                        <div className="space-y-2 flex-1">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        </div>
                    </CardHeader>
                    <CardFooter>
                        <Skeleton className="h-9 w-20 mr-2" />
                        <Skeleton className="h-9 w-24" />
                    </CardFooter>
                    </Card>
                ))}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex space-x-2">
                <Button
                    variant={activeTab === 'view' ? 'default' : 'outline'}
                    onClick={() => setActiveTab('view')}
                >
                    Recently Viewed
                </Button>
                <Button
                    variant={activeTab === 'download' ? 'default' : 'outline'}
                    onClick={() => setActiveTab('download')}
                >
                    Recently Downloaded
                </Button>
            </div>
            
            {documents.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg bg-card py-24 text-center shadow-md">
                  <History className="h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">No Recent Activity</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Your recently {activeTab === 'view' ? 'viewed' : 'downloaded'} documents will appear here.
                  </p>
                </div>
              ) : (
                renderDocGrid(documents)
            )}
        </div>
    );
}
