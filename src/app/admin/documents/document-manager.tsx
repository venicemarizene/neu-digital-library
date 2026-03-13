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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2, Upload, FileText, Globe, Users, Eye } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const programs = [
  'Bachelor of Library and Information Science (BSLIS)',
  'Bachelor of Science in Computer Science (BSCS)',
  'Bachelor of Science in Entertainment and Multimedia Computing with Specialization in Digital Animation Technology (BSEMC-DAT)',
  'Bachelor of Science in Entertainment and Multimedia Computing with Specialization in Game Development (BSEMC-GD)',
  'Bachelor of Science in Information Technology (BSIT)',
  'Bachelor of Science in Information System (BSIS)',
];

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
  { id: 'mock-clearance', filename: 'University Clearance Form.pdf', category: 'Forms', downloadURL: '#', uploadedAt: Timestamp.fromDate(new Date('2024-04-05T11:30:00')), uploaderId: 'system-seed', description: 'Official college clearance form for graduating students.', visibility: 'ALL_CICS' },
];

export default function DocumentManager() {
  const { user } = useUser();
  const db = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const documentConstraints = useMemo(() => [orderBy('uploadedAt', 'desc')], []);
  const { data: firestoreDocs, loading } = useCollection<DocumentType>('Documents', {
    constraints: documentConstraints,
    listen: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const allDocuments = useMemo(() => {
    const existingFilenames = new Set(firestoreDocs?.map(d => d.filename) || []);
    const documentsToAdd = mockDocuments.filter(md => !existingFilenames.has(md.filename));
    
    return [...documentsToAdd, ...(firestoreDocs || [])].sort((a, b) => (b.uploadedAt as any) - (a.uploadedAt as any));
  }, [firestoreDocs]);

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
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="lg:col-span-1">
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
                      <FormControl>
                        <Input placeholder="e.g., Curriculum, Forms, Manual" {...field} />
                      </FormControl>
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

      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Existing Documents</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center h-48">
                  <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : allDocuments && allDocuments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30%]">Document</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Visibility</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allDocuments.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="font-medium">{doc.filename}</div>
                        <div className="text-sm text-muted-foreground line-clamp-2">{doc.description}</div>
                      </TableCell>
                       <TableCell>{doc.category}</TableCell>
                      <TableCell>
                        <div className='flex items-center gap-2'>
                            {doc.visibility === 'ALL_CICS' ? <Globe className='h-4 w-4 text-muted-foreground' /> : <Users className='h-4 w-4 text-muted-foreground' />}
                            <span className='text-xs'>
                                {doc.visibility === 'PROGRAM_SPECIFIC' ? doc.targetProgram?.match(/\(([^)]+)\)/)?.[1] || 'Specific' : 'All CICS'}
                            </span>
                        </div>
                      </TableCell>
                      <TableCell>{doc.uploadedAt ? format(doc.uploadedAt.toDate(), 'yyyy-MM-dd') : ''}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleView(doc as DocumentType)}>
                            <Eye className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label={`Delete ${doc.filename}`} disabled={doc.id.startsWith('mock-')} >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
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
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/50 p-12 text-center">
                    <FileText className="h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">No Documents Uploaded</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Use the form to upload the first document.
                    </p>
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
