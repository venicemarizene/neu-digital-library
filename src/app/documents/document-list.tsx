'use client';
import { useState, useMemo, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, orderBy, Timestamp, where } from 'firebase/firestore';
import { useUser, useFirestore, useCollection } from '@/firebase';
import type { Document as DocumentType } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, FileText, Loader2, Search, Ban, Eye, LayoutGrid, List } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const categories = ['All', 'Curriculum', 'Manual', 'Form', 'Guide'];

export default function DocumentList() {
  const { user, appUser, isBlocked } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [downloading, setDownloading] = useState<string | null>(null);
  const [view, setView] = useState<'grid' | 'list'>('grid');

  const allCicsConstraints = useMemo(() => [
    where('visibility', '==', 'ALL_CICS'),
    orderBy('uploadedAt', 'desc')
  ], []);

  const programSpecificConstraints = useMemo(() => {
      if (!appUser?.program) return [];
      return [
          where('visibility', '==', 'PROGRAM_SPECIFIC'),
          where('targetProgram', '==', appUser.program),
          orderBy('uploadedAt', 'desc')
      ];
  }, [appUser?.program]);

  const { data: allCicsDocs, loading: loadingAll, error: errorAll } = useCollection<DocumentType>('Documents', { constraints: allCicsConstraints, listen: true });
  const { data: programDocs, loading: loadingProgram, error: errorProgram } = useCollection<DocumentType>('Documents', { 
    constraints: programSpecificConstraints, 
    listen: true, 
    skip: !appUser?.program 
  });

  const loading = loadingAll || loadingProgram;

  const allDocuments = useMemo(() => {
    const firestoreDocs = [...(allCicsDocs || []), ...(programDocs || [])];
    const uniqueFirestoreDocs = Array.from(new Map(firestoreDocs.map(doc => [doc.id, doc])).values());
    
    return uniqueFirestoreDocs.sort((a, b) => (b.uploadedAt as any) - (a.uploadedAt as any));
  }, [allCicsDocs, programDocs]);
  
  const filteredDocuments = useMemo(() => {
    let docs = allDocuments;
    if (activeCategory !== 'All') {
        docs = docs.filter(doc => (doc as any).category.toLowerCase() === activeCategory.toLowerCase());
    }
    if (searchTerm) {
        docs = docs.filter(doc =>
            doc.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
            doc.description?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }
    return docs;
  }, [allDocuments, searchTerm, activeCategory]);

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

  const renderGrid = (docs: DocumentType[]) => (
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
                <Button variant="outline" size="sm" onClick={() => handleView(doc as DocumentType)} disabled={isBlocked}>
                    <Eye className="mr-2 h-4 w-4" />
                    View
                </Button>
                <Button size="sm" onClick={() => handleDownload(doc as DocumentType)} disabled={downloading === doc.id || isBlocked}>
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

  const renderList = (docs: DocumentType[]) => (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
      {/* Header for desktop */}
      <div className="hidden md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-4 items-center px-6 py-3 border-b">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">TITLE</span>
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">VISIBILITY</span>
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">UPLOADED DATE</span>
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">ACTIONS</span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-border">
        {docs.map((doc) => (
          <div key={doc.id} className="p-4 hover:bg-muted/50 transition-colors">
            {/* Desktop View */}
            <div className="hidden md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-4 items-center">
              <div className="flex items-center gap-4">
                <div className="bg-orange-100 text-orange-600 p-2 rounded-lg">
                  <FileText className="h-6 w-6"/>
                </div>
                <div>
                  <p className="font-bold text-foreground line-clamp-1">{doc.filename}</p>
                  <p className="text-sm text-muted-foreground">PDF Document</p>
                </div>
              </div>
              <div>
                <Badge className={`font-semibold border-transparent ${doc.visibility === 'ALL_CICS' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'}`}>
                  {doc.visibility === 'ALL_CICS' ? 'All CICS' : 'Program-specified'}
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm">
                {doc.uploadedAt ? format(doc.uploadedAt.toDate(), 'MMM d, yyyy') : 'N/A'}
              </p>
              <div className="flex justify-end">
                <TooltipProvider>
                  <div className="flex items-center justify-end gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => handleView(doc)} disabled={isBlocked}>
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">View</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>View</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => handleDownload(doc)} disabled={downloading === doc.id || isBlocked}>
                          {downloading === doc.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                          <span className="sr-only">Download</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Download</p></TooltipContent>
                    </Tooltip>
                  </div>
                </TooltipProvider>
              </div>
            </div>

            {/* Mobile View */}
            <div className="md:hidden flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-orange-100 text-orange-600 p-2 rounded-lg">
                    <FileText className="h-6 w-6"/>
                  </div>
                  <div>
                    <p className="font-bold text-foreground line-clamp-2">{doc.filename}</p>
                    <p className="text-sm text-muted-foreground">PDF Document</p>
                  </div>
                </div>
                <TooltipProvider>
                  <div className="flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => handleView(doc)} disabled={isBlocked}>
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">View</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>View</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => handleDownload(doc)} disabled={downloading === doc.id || isBlocked}>
                          {downloading === doc.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                          <span className="sr-only">Download</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Download</p></TooltipContent>
                    </Tooltip>
                  </div>
                </TooltipProvider>
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-card-foreground">Visibility:</span>
                  <Badge className={`font-semibold border-transparent ${doc.visibility === 'ALL_CICS' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'}`}>
                    {doc.visibility === 'ALL_CICS' ? 'All CICS' : 'Program-specified'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-card-foreground">Uploaded:</span>
                  <span>{doc.uploadedAt ? format(doc.uploadedAt.toDate(), 'MMM d, yyyy') : 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4">
               <Skeleton className="h-10 flex-1" />
                <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                        <Skeleton className="h-10 w-20" />
                        <Skeleton className="h-10 w-20" />
                        <Skeleton className="h-10 w-20" />
                    </div>
                    <div className="flex gap-2">
                        <Skeleton className="h-10 w-10" />
                        <Skeleton className="h-10 w-10" />
                    </div>
                </div>
            </div>
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
                    <Skeleton className="h-9 w-20 mr-2" />
                    <Skeleton className="h-9 w-24" />
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
      <div className="flex flex-col gap-4">
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
                type="search"
                placeholder="Search by file, description..."
                className="w-full pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={isBlocked}
            />
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex gap-2 flex-wrap">
                {categories.map(cat => (
                    <Button key={cat} variant={activeCategory === cat ? 'default' : 'outline'} onClick={() => setActiveCategory(cat)}>
                        {cat}
                    </Button>
                ))}
            </div>
            <div className="flex items-center gap-2">
                <Button variant={view === 'grid' ? 'default' : 'outline'} onClick={() => setView('grid')}>
                    <LayoutGrid className="mr-2 h-4 w-4" />
                    Grid
                </Button>
                <Button variant={view === 'list' ? 'default' : 'outline'} onClick={() => setView('list')}>
                    <List className="mr-2 h-4 w-4" />
                    List
                </Button>
            </div>
        </div>
      </div>

      {filteredDocuments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-card py-24 text-center">
          <FileText className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No Documents Found</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {searchTerm || activeCategory !== 'All' ? 'Try adjusting your search or filters.' : 'There are no documents in the library for your program yet.'}
          </p>
        </div>
      ) : (
        view === 'grid' ? renderGrid(filteredDocuments) : renderList(filteredDocuments)
      )}
    </div>
  );
}
