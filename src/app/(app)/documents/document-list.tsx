'use client';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import { useUser, useFirestore } from '@/firebase';
import { useState, useMemo, useEffect } from 'react';
import type { Document as DocumentType } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, FileText, Loader2, Search, Ban, Eye, LayoutGrid, List } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { format, subDays } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const categories = ['All', 'Curriculum', 'Manual', 'Form', 'Guide'];
type SortOption = 'uploadedAt' | 'filename';

export default function DocumentList() {
  const { user, appUser, isBlocked, loading: userLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [downloading, setDownloading] = useState<string | null>(null);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [sortOption, setSortOption] = useState<SortOption>('uploadedAt');

  const [allDocuments, setAllDocuments] = useState<DocumentType[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [interactedDocIds, setInteractedDocIds] = useState<Set<string>>(new Set());
  const [logsLoading, setLogsLoading] = useState(true);

  // Fetch interaction logs to determine 'New' badge visibility
  useEffect(() => {
    if (!user || !db) {
      setLogsLoading(false);
      return;
    }

    const fetchInteractionLogs = async () => {
      setLogsLoading(true);
      try {
        const logsQuery = query(
          collection(db, 'Logs'),
          where('userId', '==', user.uid),
          where('action', 'in', ['view', 'download'])
        );
        const logsSnapshot = await getDocs(logsQuery);
        const ids = new Set(logsSnapshot.docs.map(d => d.data().documentId as string));
        setInteractedDocIds(ids);
      } catch (error) {
        console.error('Error fetching interaction logs:', error);
        // Silently fail — badges for unseen docs just won't show
      } finally {
        setLogsLoading(false);
      }
    };

    fetchInteractionLogs();
  }, [user, db]);

  // Fetch documents using visibility + targetProgram (not allowedStudentIds)
  useEffect(() => {
    if (!user || !appUser?.program || !db) {
      setDocsLoading(false);
      return;
    }

    const fetchDocs = async () => {
      try {
        setDocsLoading(true);
    
        // ✅ No isArchived filter in the query at all
        const allCicsQuery = query(
          collection(db, 'Documents'),
          where('visibility', '==', 'ALL_CICS')
        );
    
        const programQuery = query(
          collection(db, 'Documents'),
          where('visibility', '==', 'PROGRAM_SPECIFIC'),
          where('targetProgram', '==', appUser.program)
        );
    
        const [allCicsSnap, programSnap] = await Promise.all([
          getDocs(allCicsQuery),
          getDocs(programQuery),
        ]);
    
        // ✅ Filter archived documents client-side after fetching
        const merged: DocumentType[] = [
          ...allCicsSnap.docs.map(d => ({ id: d.id, ...d.data() } as DocumentType)),
          ...programSnap.docs.map(d => ({ id: d.id, ...d.data() } as DocumentType)),
        ].filter(doc => doc.isArchived !== true);
    
        setAllDocuments(merged);
      } catch (err: any) {
        console.error('Error fetching documents:', err);
      } finally {
        setDocsLoading(false);
      }
    };

    fetchDocs();
  }, [user, appUser?.program, db]);

  const loading = userLoading || docsLoading || logsLoading;

  const filteredDocuments = useMemo(() => {
    if (!allDocuments) return [];

    let docs = [...allDocuments];

    // Client-side sorting
    docs.sort((a, b) => {
      if (sortOption === 'uploadedAt') {
        const dateA = a.uploadedAt?.toDate()?.getTime() || 0;
        const dateB = b.uploadedAt?.toDate()?.getTime() || 0;
        return dateB - dateA;
      }
      if (sortOption === 'filename') {
        return a.filename.localeCompare(b.filename);
      }
      return 0;
    });

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
  }, [allDocuments, searchTerm, activeCategory, sortOption]);

  const handleView = async (doc: DocumentType) => {
    if (isBlocked) {
      toast({ variant: 'destructive', title: 'Account Restricted', description: 'Your account is restricted from viewing files.' });
      return;
    }

    // Immediately update local state to remove the 'New' badge
    setInteractedDocIds(prevIds => new Set(prevIds).add(doc.id));

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

    setInteractedDocIds(prevIds => new Set(prevIds).add(docToDownload.id));
    setDownloading(docToDownload.id);

    try {
      const docRef = doc(db, 'Documents', docToDownload.id);
      updateDoc(docRef, { downloads: increment(1) });

      await addDoc(collection(db, 'Logs'), {
        userId: user.uid,
        documentId: docToDownload.id,
        action: 'download',
        downloadedAt: serverTimestamp(),
      });

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

  // Highlights matching search text in bold yellow
  const Highlight = ({ text, term }: { text: string | null | undefined; term: string }) => {
    if (!term.trim() || !text) {
      return <>{text}</>;
    }
    const regex = new RegExp(`(${term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return (
      <>
        {parts.map((part, i) =>
          regex.test(part) && part.toLowerCase() === term.toLowerCase() ? (
            <mark key={i} className="bg-yellow-200 font-bold px-0 text-black rounded">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  const renderGrid = (docs: DocumentType[]) => {
    const sevenDaysAgo = subDays(new Date(), 7);
    return (
      <TooltipProvider delayDuration={100}>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {docs.map((doc) => {
            const hasInteracted = interactedDocIds.has(doc.id);
            const isNewByDate = doc.uploadedAt && doc.uploadedAt.toDate() > sevenDaysAgo;
            const showNewBadge = !hasInteracted && (isNewByDate || !hasInteracted);
            return (
              <Tooltip key={doc.id}>
                <TooltipTrigger asChild>
                  <Card className="relative flex flex-col transition-all hover:shadow-lg rounded-lg">
                    {showNewBadge && (
                      <Badge className="absolute top-3 right-3 z-10 bg-blue-100 text-blue-800 text-xs font-medium rounded-full px-2 py-0.5 border-transparent hover:bg-blue-100">
                        New
                      </Badge>
                    )}
                    <CardHeader>
                      <div className="flex items-start gap-4">
                        <div className="bg-primary/10 p-2 rounded-md">
                          <FileText className="h-6 w-6 flex-shrink-0 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="line-clamp-2 text-base font-headline">
                            <Highlight text={doc.filename} term={searchTerm} />
                          </CardTitle>
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
                </TooltipTrigger>
                <TooltipContent side="bottom" align="center" className="max-w-xs">
                  <div className="space-y-1.5 p-2 text-left">
                    <p className="font-semibold text-sm">
                      <Highlight text={doc.description || 'No description available.'} term={searchTerm} />
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Uploaded: {doc.uploadedAt ? format(doc.uploadedAt.toDate(), 'PPP') : 'N/A'}
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>
    );
  };

  const renderList = (docs: DocumentType[]) => {
    const sevenDaysAgo = subDays(new Date(), 7);
    return (
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
          {docs.map((doc) => {
            const hasInteracted = interactedDocIds.has(doc.id);
            const isNewByDate = doc.uploadedAt && doc.uploadedAt.toDate() > sevenDaysAgo;
            const showNewBadge = !hasInteracted && (isNewByDate || !hasInteracted);
            return (
              <div key={doc.id} className="p-4 hover:bg-muted/50 transition-colors">
                {/* Desktop View */}
                <div className="hidden md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-4 items-center">
                  <div className="flex items-center gap-4">
                    <div className="bg-primary/10 text-primary p-2 rounded-lg">
                      <FileText className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-foreground line-clamp-1">
                          <Highlight text={doc.filename} term={searchTerm} />
                        </p>
                        {showNewBadge && (
                          <Badge className="bg-blue-100 text-blue-800 border-transparent text-xs font-medium px-2 py-0.5 hover:bg-blue-100">
                            New
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">PDF Document</p>
                    </div>
                  </div>
                  <div>
                    <Badge className={`font-semibold border-transparent ${doc.visibility === 'ALL_CICS' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'}`}>
                      {doc.visibility === 'ALL_CICS' ? 'All CICS' : 'Program-specified'}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {doc.uploadedAt ? format(doc.uploadedAt.toDate(), 'PPP') : 'N/A'}
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
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="bg-primary/10 text-primary p-2 rounded-lg">
                        <FileText className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2">
                          <p className="font-bold text-foreground line-clamp-2 flex-grow">
                            <Highlight text={doc.filename} term={searchTerm} />
                          </p>
                          {showNewBadge && (
                            <Badge className="bg-blue-100 text-blue-800 border-transparent text-xs font-medium px-2 py-0.5 flex-shrink-0 mt-1 hover:bg-blue-100">
                              New
                            </Badge>
                          )}
                        </div>
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
                      <span>{doc.uploadedAt ? format(doc.uploadedAt.toDate(), 'PPP') : 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

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
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-grow w-full">
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
          <div className="flex items-center gap-2 flex-shrink-0">
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
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 w-full">
          <div className="flex flex-wrap gap-2 w-full">
            {categories.map(cat => (
              <Button key={cat} variant={activeCategory === cat ? 'default' : 'outline'} onClick={() => setActiveCategory(cat)}>
                {cat}
              </Button>
            ))}
          </div>
          <div className="w-full sm:w-auto md:w-[200px]">
            <Select value={sortOption} onValueChange={(value) => setSortOption(value as SortOption)}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="uploadedAt">Sort by: Newest</SelectItem>
                <SelectItem value="filename">Sort by: Alphabetical</SelectItem>
              </SelectContent>
            </Select>
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
