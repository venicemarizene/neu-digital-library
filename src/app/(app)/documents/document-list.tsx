'use client';
import { useState, useMemo, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, orderBy, Timestamp, where } from 'firebase/firestore';
import { useUser, useFirestore, useCollection } from '@/firebase';
import type { Document as DocumentType } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, FileText, Loader2, Search, Ban, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const categories = ['All', 'Curriculum', 'Manual', 'Form', 'Guide', 'Academic'];

const mockDocuments: (DocumentType & {id: string})[] = [
  { id: 'mock-handbook', filename: 'CICS Student Handbook.pdf', category: 'Manual', downloadURL: '#', uploadedAt: Timestamp.fromDate(new Date('2024-01-15T09:00:00')), uploaderId: 'system-seed', description: 'The rules and regulations for CICS students for the current academic year.', visibility: 'ALL_CICS' },
  { id: 'mock-bslis', filename: 'BSLIS Curriculum.pdf', category: 'Curriculum', downloadURL: '#', uploadedAt: Timestamp.fromDate(new Date('2024-02-01T10:00:00')), uploaderId: 'system-seed', description: 'The official program sequence for Bachelor of Library and Information Science.', visibility: 'PROGRAM_SPECIFIC', targetProgram: 'Bachelor of Library and Information Science (BSLIS)' },
  { id: 'mock-bscs', filename: 'BSCS Curriculum.pdf', category: 'Curriculum', downloadURL: '#', uploadedAt: Timestamp.fromDate(new Date('2024-02-01T10:10:00')), uploaderId: 'system-seed', description: 'The official program sequence for Bachelor of Science in Computer Science.', visibility: 'PROGRAM_SPECIFIC', targetProgram: 'Bachelor of Science in Computer Science (BSCS)' },
  { id: 'mock-bsemc-dat', filename: 'BSEMC-DAT Curriculum.pdf', category: 'Curriculum', downloadURL: '#', uploadedAt: Timestamp.fromDate(new Date('2024-02-01T10:05:00')), uploaderId: 'system-seed', description: 'The official program sequence for Bachelor of Science in Entertainment and Multimedia Computing with Specialization in Digital Animation Technology.', visibility: 'PROGRAM_SPECIFIC', targetProgram: 'Bachelor of Science in Entertainment and Multimedia Computing with Specialization in Digital Animation Technology (BSEMC-DAT)' },
  { id: 'mock-bsemc-gd', filename: 'BSEMC-GD Curriculum.pdf', category: 'Curriculum', downloadURL: '#', uploadedAt: Timestamp.fromDate(new Date('2024-02-01T10:15:00')), uploaderId: 'system-seed', description: 'The official program sequence for Bachelor of Science in Entertainment and Multimedia Computing with Specialization in Game Development.', visibility: 'PROGRAM_SPECIFIC', targetProgram: 'Bachelor of Science in Entertainment and Multimedia Computing with Specialization in Game Development (BSEMC-GD)' },
  { id: 'mock-bsit', filename: 'BSIT Curriculum.pdf', category: 'Curriculum', downloadURL: '#', uploadedAt: Timestamp.fromDate(new Date('2024-02-01T10:20:00')), uploaderId: 'system-seed', description: 'The official program sequence for Bachelor of Science in Information Technology.', visibility: 'PROGRAM_SPECIFIC', targetProgram: 'Bachelor of Science in Information Technology (BSIT)' },
  { id: 'mock-bsis', filename: 'BSIS Curriculum.pdf', category: 'Curriculum', downloadURL: '#', uploadedAt: Timestamp.fromDate(new Date('2024-02-01T10:25:00')), uploaderId: 'system-seed', description: 'The official program sequence for Bachelor of Science in Information System.', visibility: 'PROGRAM_SPECIFIC', targetProgram: 'Bachelor of Science in Information System (BSIS)' },
  { id: 'mock-faq', filename: 'Internship Requirements FAQ.pdf', category: 'Guide', downloadURL: '#', uploadedAt: Timestamp.fromDate(new Date('2024-03-10T14:00:00')), uploaderId: 'system-seed', description: 'Frequently asked questions about the CICS internship programs.', visibility: 'ALL_CICS' },
  { id: 'mock-clearance', filename: 'University Clearance Form.pdf', category: 'Form', downloadURL: '#', uploadedAt: Timestamp.fromDate(new Date('2024-04-05T11:30:00')), uploaderId: 'system-seed', description: 'Official college clearance form for graduating students.', visibility: 'ALL_CICS' },
];

export default function DocumentList() {
  const { user, appUser, isBlocked } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [downloading, setDownloading] = useState<string | null>(null);

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

    const existingFilenames = new Set(uniqueFirestoreDocs.map(d => d.filename));

    const documentsToAdd = mockDocuments.filter(md => {
      if (existingFilenames.has(md.filename)) return false;
      
      if (md.visibility === 'ALL_CICS') return true;
      if (md.visibility === 'PROGRAM_SPECIFIC' && md.targetProgram === appUser?.program) return true;
      
      return false;
    });
    
    return [...documentsToAdd, ...uniqueFirestoreDocs].sort((a, b) => (b.uploadedAt as any) - (a.uploadedAt as any));
  }, [allCicsDocs, programDocs, appUser?.program]);
  
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
    if ((doc as any).id.startsWith('mock-')) {
        toast({ variant: 'default', title: 'Sample Document', description: 'This is a sample document for demonstration purposes.' });
        return;
    }
    if (isBlocked) {
      toast({ variant: 'destructive', title: 'Account Restricted', description: 'Your account is restricted from viewing files.' });
      return;
    }

    if (user && db && !doc.id.startsWith('mock-')) {
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
    if ((doc as any).id.startsWith('mock-')) {
        toast({ variant: 'default', title: 'Sample Document', description: 'This is a sample document for demonstration purposes.' });
        return;
    }
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

  if (loading) {
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4">
               <Skeleton className="h-10 flex-1 max-w-sm" />
                <div className="flex gap-2">
                    <Skeleton className="h-10 w-20" />
                    <Skeleton className="h-10 w-20" />
                    <Skeleton className="h-10 w-20" />
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
        <div className="relative max-w-sm">
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
        <div className="flex gap-2 flex-wrap">
            {categories.map(cat => (
                <Button key={cat} variant={activeCategory === cat ? 'default' : 'outline'} onClick={() => setActiveCategory(cat)}>
                    {cat}
                </Button>
            ))}
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
        renderDocGrid(filteredDocuments)
      )}
    </div>
  );
}
