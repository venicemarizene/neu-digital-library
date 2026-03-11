'use client';
import { useState, useMemo } from 'react';
import { collection, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { useUser, useFirestore, useCollection } from '@/firebase';
import type { Document as DocumentType } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, FileText, Loader2, Search, Ban } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function DocumentList() {
  const { user, isBlocked } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const documentConstraints = useMemo(() => [orderBy('uploadedAt', 'desc')], []);
  const { data: documents, loading } = useCollection<DocumentType>('Documents', {
    constraints: documentConstraints,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [downloading, setDownloading] = useState<string | null>(null);

  const filteredDocuments = useMemo(() => {
    if (!documents) return [];
    if (!searchTerm) return documents;
    return documents.filter(doc =>
      doc.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [documents, searchTerm]);

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
        downloadedAt: serverTimestamp(),
      });

      const link = document.createElement('a');
      link.href = doc.downloadURL;
      link.target = '_blank';
      link.download = doc.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({ variant: 'destructive', title: 'Download Failed', description: 'Could not download the file. Please try again.' });
    } finally {
      setDownloading(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex-row items-start gap-4">
                <Skeleton className="h-10 w-10 rounded-md" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-10 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isBlocked && (
        <Alert variant="destructive">
            <Ban className="h-4 w-4" />
            <AlertTitle>Account Restricted</AlertTitle>
            <AlertDescription>
            Your account is restricted from downloading files. Please contact an administrator.
            </AlertDescription>
        </Alert>
      )}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search by filename or category..."
          className="w-full pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={isBlocked}
        />
      </div>

      {filteredDocuments.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredDocuments.map((doc) => (
            <Card key={doc.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <FileText className="h-10 w-10 flex-shrink-0 text-primary" />
                  <div>
                    <CardTitle className="line-clamp-2 text-lg font-headline">{doc.filename}</CardTitle>
                    <CardDescription>{doc.category}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground">
                  {doc.uploadedAt && `Uploaded: ${format(new Date(doc.uploadedAt.seconds * 1000), 'yyyy-MM-dd')}`}
                </p>
              </CardContent>
              <CardFooter>
                <Button onClick={() => handleDownload(doc)} disabled={downloading === doc.id || isBlocked} className="w-full">
                  {downloading === doc.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  {downloading === doc.id ? 'Downloading...' : 'Download'}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/50 py-24 text-center">
          <FileText className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No Documents Found</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {searchTerm ? 'Try a different search term.' : 'There are no documents in the library yet.'}
          </p>
        </div>
      )}
    </div>
  );
}
