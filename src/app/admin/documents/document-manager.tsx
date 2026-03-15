'use client';
import { useState, useMemo, useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, addDoc, serverTimestamp, deleteDoc, doc as firestoreDoc, Timestamp, updateDoc, increment } from 'firebase/firestore';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { supabase } from '@/lib/supabaseClient';
import type { Document as DocumentType } from '@/lib/types';
import { orderBy } from 'firebase/firestore';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2, Upload, FileText, Globe, Users, Eye, Download, Search } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const programs = [
  'Bachelor of Library and Information Science (BSLIS)',
  'Bachelor of Science in Computer Science (BSCS)',
  'Bachelor of Science in Entertainment and Multimedia Computing with Specialization in Digital Animation Technology (BSEMC-DAT)',
  'Bachelor of Science in Entertainment and Multimedia Computing with Specialization in Game Development (BSEMC-GD)',
  'Bachelor of Science in Information Technology (BSIT)',
  'Bachelor of Science in Information System (BSIS)',
];

const docCategories = ['Curriculum', 'Form', 'Manual', 'Guide'];
const allDocCategories = ['All', ...docCategories];

type SortOption = 'downloads' | 'uploadedAt' | 'filename';


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

export default function DocumentManager() {
  const { user, loading: userLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [programFilter, setProgramFilter] = useState('ALL');
  const [downloading, setDownloading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sortOption, setSortOption] = useState<SortOption>('uploadedAt');

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

  const programFilterOptions = useMemo(() => [
    { label: "All Programs", value: "ALL" },
    { label: "All CICS (General)", value: "ALL_CICS" },
    ...programs.map(p => ({
        label: p.match(/\(([^)]+)\)/)?.[1] || p,
        value: p
    }))
  ], []);

  const documentConstraints = useMemo(() => [
      orderBy(sortOption, sortOption === 'filename' ? 'asc' : 'desc')
  ], [sortOption]);
  
  const { data: firestoreDocs, loading: docsLoading } = useCollection<DocumentType>('Documents', {
    constraints: documentConstraints,
    listen: true,
    skip: userLoading || !user,
  });

  const loading = userLoading || docsLoading;

  const filteredDocuments = useMemo(() => {
    let docs = firestoreDocs || [];

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
  }, [firestoreDocs, activeCategory, programFilter, searchTerm]);

  async function onSubmit(values: z.infer<typeof documentSchema>) {
    const file = values.file?.[0];
    if (!file) {
      toast({ variant: 'destructive', title: 'Error', description: 'No file selected.' });
      return;
    }
  
    if (!user || !db) {
      toast({ variant: 'destructive', title: 'Error', description: 'Firebase services not ready.' });
      return;
    }

    if (!supabase) {
      toast({
        variant: 'destructive',
        title: 'Supabase Not Configured',
        description: 'Please provide Supabase credentials in your .env.local file to upload documents.',
      });
      return;
    }
  
    setIsSubmitting(true);
  
    const filePath = `${Date.now()}_${file.name}`;

    try {
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('documents')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false,
            });
            
        if (uploadError) {
            if (uploadError.message.includes('violates row-level security policy')) {
                toast({
                    variant: 'destructive',
                    title: 'Supabase Permission Error',
                    description: "Upload failed due to Supabase Row Level Security. Please create a policy in your Supabase dashboard to allow uploads.",
                    duration: 10000,
                });
            } else {
                toast({ variant: 'destructive', title: 'Upload Failed', description: uploadError.message });
            }
            return;
        }

        const { data: urlData } = supabase.storage
            .from('documents')
            .getPublicUrl(uploadData.path);

        if (!urlData.publicUrl) {
            toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not get public URL for the file.' });
            await supabase.storage.from('documents').remove([uploadData.path]);
            return;
        }
        
        const docData = {
            filename: file.name,
            category: values.category,
            description: values.description,
            downloadURL: urlData.publicUrl,
            storagePath: uploadData.path,
            uploadedAt: serverTimestamp(),
            uploaderId: user.uid,
            visibility: values.visibility,
            targetProgram: values.visibility === 'PROGRAM_SPECIFIC' ? values.targetProgram : null,
            downloads: 0,
        };

        const documentsCollection = collection(db, 'Documents');
        const docRef = await addDoc(documentsCollection, docData).catch((error) => {
             if (error.name === 'FirebaseError' && error.code === 'permission-denied') {
                 const permissionError = new FirestorePermissionError({
                    path: collection(db, 'Documents').path,
                    operation: 'create',
                    requestResourceData: docData
                 });
                 errorEmitter.emit('permission-error', permissionError);
             } else {
                 throw error; // re-throw other errors
             }
        });
        
        if (docRef) {
            toast({
                title: 'Success!',
                description: `"${file.name}" has been uploaded.`,
            });
            form.reset();
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    } catch (error: any) {
        console.error("An unexpected error occurred during upload:", error);
        toast({
            variant: 'destructive',
            title: 'An Unexpected Error Occurred',
            description: error.message || 'Could not save the document record. Please check the console.',
        });
    } finally {
        setIsSubmitting(false);
    }
  }


  const handleView = (doc: DocumentType) => {
    window.open(doc.downloadURL, '_blank');
  };
  
  const handleDownload = async (docToDownload: DocumentType) => {
    if(!db) return;
    setDownloading(docToDownload.id);
    try {
      // Increment download count
      const docRef = firestoreDoc(db, 'Documents', docToDownload.id);
      updateDoc(docRef, { downloads: increment(1) });
        
      if (user) {
        await addDoc(collection(db, 'Logs'), {
            userId: user.uid,
            documentId: docToDownload.id,
            action: 'download',
            downloadedAt: serverTimestamp(),
        });
      }

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


  const handleDelete = async (docToDelete: DocumentType) => {
    if (!db) {
        toast({ variant: 'destructive', title: 'Database not available.' });
        return;
    }

    if (docToDelete.storagePath) {
        if (!supabase) {
          console.warn('Supabase client is not configured, skipping file deletion from storage. The Firestore record will still be deleted.');
        } else {
          const { error: deleteError } = await supabase.storage
              .from('documents')
              .remove([docToDelete.storagePath]);
          
          if (deleteError) {
              if (deleteError.message.includes('violates row-level security policy')) {
                  toast({
                      variant: 'destructive',
                      title: 'Supabase Permission Error',
                      description: "Delete failed due to Supabase Row Level Security. Please create a policy to allow deletes.",
                      duration: 10000,
                  });
              } else {
                  console.error("Error deleting file from Supabase Storage:", deleteError);
                  toast({
                      variant: 'destructive',
                      title: 'Storage Delete Failed',
                      description: 'Could not delete the file from storage, but will still attempt to delete the record.',
                  });
              }
          }
        }
    } else {
        console.warn(`Document ${docToDelete.id} has no storagePath. Cannot delete from storage.`);
    }

    const docRef = firestoreDoc(db, 'Documents', docToDelete.id);
    try {
      await deleteDoc(docRef);
      toast({ title: 'Success', description: 'Document record deleted successfully.' });
    } catch (error: any) {
      if (error.name === 'FirebaseError' && error.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
      } else {
        console.error("Error deleting document record:", error);
        toast({ 
          variant: 'destructive', 
          title: 'Delete Failed', 
          description: error.message || 'Could not delete document record.' 
        });
      }
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Card className='rounded-lg'>
          <CardHeader>
            <CardTitle>Upload New Document</CardTitle>
            <CardDescription>Select a PDF and provide its details to upload to Supabase.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="file"
                  render={({ field: { onChange, value, ...rest } }) => (
                    <FormItem>
                      <FormLabel>Document File (PDF)</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <Input
                            type="file"
                            accept=".pdf"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={(e) => onChange(e.target.files)}
                            onBlur={rest.onBlur}
                            name={rest.name}
                            disabled={rest.disabled || isSubmitting}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isSubmitting}
                          >
                            <Upload className="mr-2 h-4 w-4" />
                            Choose File
                          </Button>
                          {value?.[0] && (
                            <span className="text-sm text-muted-foreground truncate">
                              {value[0].name}
                            </span>
                          )}
                        </div>
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
                       <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
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
                        <Textarea placeholder="A brief summary of the document." {...field} disabled={isSubmitting} />
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
                          disabled={isSubmitting}
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
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
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
                  {isSubmitting ? 'Uploading...' : 'Upload Document'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      <div>
        <Card className='rounded-lg'>
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
                     <Select value={sortOption} onValueChange={(value) => setSortOption(value as SortOption)}>
                        <SelectTrigger className="w-full md:w-[240px]">
                            <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="downloads">Sort by: Most Downloaded</SelectItem>
                            <SelectItem value="uploadedAt">Sort by: Newest</SelectItem>
                            <SelectItem value="filename">Sort by: Alphabetical</SelectItem>
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredDocuments.map((doc) => (
                        <Card key={doc.id} className="flex flex-col transition-all hover:shadow-lg rounded-lg">
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
                            <CardContent className="flex-1 space-y-1">
                                <p className="text-xs text-muted-foreground">
                                    Uploaded: {doc.uploadedAt ? format(doc.uploadedAt.toDate(), 'yyyy-MM-dd') : 'N/A'}
                                </p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Download className="h-3 w-3" /> {doc.downloads ?? 0} downloads
                                </p>
                            </CardContent>
                            <CardFooter className="mt-auto">
                                <TooltipProvider delayDuration={100}>
                                    <div className="flex w-full items-center justify-between">
                                        <div className="flex items-center gap-2">
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
                                        </div>
                                        
                                        <AlertDialog>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <AlertDialogTrigger asChild>
                                                        <Button size="icon" variant="outline" className="text-red-500 border border-red-200 hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-all duration-200">
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
                                    </div>
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
