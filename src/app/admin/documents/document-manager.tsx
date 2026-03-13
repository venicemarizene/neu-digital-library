'use client';
import { useState, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, addDoc, serverTimestamp, deleteDoc, doc as firestoreDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useUser, useFirestore, useStorage, useCollection } from '@/firebase';
import type { Document as DocumentType } from '@/lib/types';
import { orderBy } from 'firebase/firestore';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2, Upload, FileText, Globe, Users, Eye, Download, Search } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const programs = [
  'Bachelor of Library and Information Science (BSLIS)',
  'Bachelor of Science in Computer Science (BSCS)',
  'Bachelor of Science in Entertainment and Multimedia Computing with Specialization in Digital Animation Technology (BSEMC-DAT)',
  'Bachelor of Science in Entertainment and Multimedia Computing with Specialization in Game Development (BSEMC-GD)',
  'Bachelor of Science in Information Technology (BSIT)',
  'Bachelor of Science in Information System (BSIS)',
];

const docCategories = ['Curriculum', 'Form', 'Manual', 'Guide', 'Academic'];
const allDocCategories = ['All', ...docCategories];


const documentSchema = z.object({
  file: z.instanceof(FileList).refine(files => files?.length === 1, 'File is required.'),
  category: z.string().min(1, 'Category is required.'),
  description: z.string().min(1, 'Description is required.'),
  visibility: z.enum(['ALL_CICS', 'PROGRAM_SPECIFIC'], { required_error: 'Please select visibility.' }),
  targetProgram: z.string().optional(),
}).refine(data => {
    if (data.visibility === 'PROGRAM_SPECIFIC') {
        return !!data.targetProgram;
    }
    return true;
}, {
    message: "Target program is required for program-specific visibility.",
    path: ["targetProgram"],
});

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

export default function DocumentManager() {
  const { user } = useUser();
  const db = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [programFilter, setProgramFilter] = useState('ALL');
  const [downloading, setDownloading] = useState<string | null>(null);

  const programFilterOptions = useMemo(() => [
    { label: "All Programs", value: "ALL" },
    { label: "All CICS (General)", value: "ALL_CICS" },
    ...programs.map(p => ({
        label: p.match(/\(([^)]+)\)/)?.[1] || p,
        value: p
    }))
  ], []);

  const documentConstraints = useMemo(() => [orderBy('uploadedAt', 'desc')], []);
  const { data: firestoreDocs, loading } = useCollection<DocumentType>('Documents', {
    constraints: documentConstraints,
    listen: true,
  });

  const allDocuments = useMemo(() => {
    const existingFilenames = new Set(firestoreDocs?.map(d => d.filename) || []);
    const documentsToAdd = mockDocuments.filter(md => !existingFilenames.has(md.filename));
    
    return [...documentsToAdd, ...(firestoreDocs || [])].sort((a, b) => (b.uploadedAt as any) - (a.uploadedAt as any));
  }, [firestoreDocs]);
  
  const filteredDocuments = useMemo(() => {
    let docs = allDocuments;

    if (activeCategory !== 'All') {
        docs = docs.filter(doc => doc.category === activeCategory);
    }
    
    if (programFilter === 'ALL_CICS') {
        docs = docs.filter(doc => doc.visibility === 'ALL_CICS');
    } else if (programFilter !== 'ALL') {
        docs = docs.filter(doc => doc.targetProgram === programFilter);
    }

    if (searchTerm) {
        docs = docs.filter(doc =>
            doc.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
            doc.description?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }

    return docs;
  }, [allDocuments, activeCategory, programFilter, searchTerm]);

  const form = useForm<z.infer<typeof documentSchema>>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      category: '',
      description: '',
      file: undefined,
      visibility: 'ALL_CICS',
    },
  });

  const visibility = useWatch({
    control: form.control,
    name: 'visibility'
  });

  async function onSubmit(values: z.infer<typeof documentSchema>) {
    if (!user) {
      toast({ variant: 'destructive', title: 'Error', description: 'You are not authenticated.' });
      return;
    }
    setIsSubmitting(true);
    try {
      const file = values.file[0];
      const storageRef = ref(storage, `cics_docs/${file.name}`);
      const uploadResult = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(uploadResult.ref);

      await addDoc(collection(db, 'Documents'), {
        filename: file.name,
        category: values.category,
        description: values.description,
        downloadURL: downloadURL,
        uploadedAt: serverTimestamp(),
        uploaderId: user.uid,
        visibility: values.visibility,
        targetProgram: values.visibility === 'PROGRAM_SPECIFIC' ? values.targetProgram : null,
      });

      toast({ title: 'Success', description: 'Document uploaded successfully.' });
      form.reset();
    } catch (error: any) {
      console.error('Error uploading document:', error);
      let description = 'Could not upload document.';
      if (error.code === 'storage/object-not-found') {
        description = 'File not found during upload process.';
      }
      toast({ variant: 'destructive', title: 'Upload Failed', description });
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleView = (doc: DocumentType) => {
    if (doc.id.startsWith('mock-')) {
        toast({ variant: 'default', title: 'Sample Document', description: 'This is a sample document for demonstration purposes.' });
        return;
    }
    window.open(doc.downloadURL, '_blank');
  };
  
  const handleDownload = async (doc: DocumentType) => {
    if (doc.id.startsWith('mock-')) {
        toast({ variant: 'default', title: 'Sample Document', description: 'This is a sample document for demonstration purposes.' });
        return;
    }
    setDownloading(doc.id);
    try {
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


  const handleDelete = async (docToDelete: DocumentType) => {
    if (docToDelete.id.startsWith('mock-')) {
        toast({ variant: 'destructive', title: 'Action Not Allowed', description: 'Sample documents cannot be deleted.' });
        return;
    }
    try {
      await deleteDoc(firestoreDoc(db, 'Documents', docToDelete.id));
      const storageRef = ref(storage, `cics_docs/${docToDelete.filename}`);
      await deleteObject(storageRef);
      toast({ title: 'Success', description: 'Document deleted successfully.' });
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({ variant: 'destructive', title: 'Delete Failed', description: 'Could not delete document.' });
    }
  };

  const fileRef = form.register("file");

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Upload New Document</CardTitle>
            <CardDescription>Select a PDF and provide its details.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="file"
                  render={() => (
                    <FormItem>
                      <FormLabel>Document File (PDF)</FormLabel>
                      <FormControl>
                        <Input type="file" accept=".pdf" {...fileRef} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                       <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {docCategories.map((category) => (
                            <SelectItem key={category} value={category}>{category}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input placeholder="A brief summary of the document." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="visibility"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Visibility</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="ALL_CICS" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              All CICS Students
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="PROGRAM_SPECIFIC" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Program-Specific
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {visibility === 'PROGRAM_SPECIFIC' && (
                    <FormField
                    control={form.control}
                    name="targetProgram"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Target Program</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a target program" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {programs.map((p) => (
                                <SelectItem key={p} value={p}>{p}</SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                )}

                <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  Upload Document
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      <div>
        <Card>
          <CardHeader>
            <CardTitle>Existing Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search by file, description..."
                            className="w-full pl-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Select value={programFilter} onValueChange={setProgramFilter}>
                        <SelectTrigger className="w-full md:w-[240px]">
                            <SelectValue placeholder="Filter by program..." />
                        </SelectTrigger>
                        <SelectContent>
                            {programFilterOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex gap-2 flex-wrap">
                    {allDocCategories.map(cat => (
                        <Button key={cat} variant={activeCategory === cat ? 'default' : 'outline'} onClick={() => setActiveCategory(cat)}>
                            {cat}
                        </Button>
                    ))}
                </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center h-48">
                  <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : filteredDocuments.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2">
                    {filteredDocuments.map((doc) => (
                        <Card key={doc.id} className="flex flex-col transition-all hover:shadow-lg">
                            <CardHeader>
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex flex-1 items-start gap-4">
                                        <div className="bg-primary/10 p-2 rounded-md mt-1">
                                            <FileText className="h-6 w-6 flex-shrink-0 text-primary" />
                                        </div>
                                        <div className="flex-1">
                                            <CardTitle className="line-clamp-3 text-base font-headline leading-snug">{doc.filename}</CardTitle>
                                            <CardDescription>{doc.category}</CardDescription>
                                        </div>
                                    </div>
                                    <div className='flex items-center gap-1 text-muted-foreground flex-shrink-0' title={doc.visibility === 'PROGRAM_SPECIFIC' ? doc.targetProgram : 'All CICS Students'}>
                                        {doc.visibility === 'ALL_CICS' ? <Globe className='h-4 w-4' /> : <Users className='h-4 w-4' />}
                                        <span className='text-xs font-medium'>
                                            {doc.visibility === 'PROGRAM_SPECIFIC' ? doc.targetProgram?.match(/\(([^)]+)\)/)?.[1] || 'Specific' : 'All'}
                                        </span>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1">
                                <p className="text-xs text-muted-foreground">
                                    Uploaded: {doc.uploadedAt ? format(doc.uploadedAt.toDate(), 'yyyy-MM-dd') : 'N/A'}
                                </p>
                            </CardContent>
                            <CardFooter className="flex items-center gap-2 mt-auto">
                                <TooltipProvider delayDuration={100}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button size="icon" variant="outline" onClick={() => handleView(doc as DocumentType)}>
                                                <Eye className="h-4 w-4" />
                                                <span className="sr-only">View</span>
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent><p>View</p></TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button size="icon" onClick={() => handleDownload(doc as DocumentType)} disabled={downloading === doc.id}>
                                                {downloading === doc.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Download className="h-4 w-4" />
                                                )}
                                                <span className="sr-only">Download</span>
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent><p>{downloading === doc.id ? 'Downloading...' : 'Download'}</p></TooltipContent>
                                    </Tooltip>

                                    <div className="flex-grow" />
                                    
                                    <AlertDialog>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <AlertDialogTrigger asChild>
                                                    <Button size="icon" variant="outline" className="border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={doc.id.startsWith('mock-')} >
                                                        <Trash2 className="h-4 w-4" />
                                                        <span className="sr-only">Delete</span>
                                                    </Button>
                                                </AlertDialogTrigger>
                                            </TooltipTrigger>
                                            <TooltipContent><p>Delete</p></TooltipContent>
                                        </Tooltip>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action cannot be undone. This will permanently delete the document
                                                "{doc.filename}" from storage and records.
                                            </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={() => handleDelete(doc)}
                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            >
                                                Delete
                                            </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </TooltipProvider>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/50 p-12 text-center">
                    <FileText className="h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">No Documents Found</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Try adjusting your search or filters.
                    </p>
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
