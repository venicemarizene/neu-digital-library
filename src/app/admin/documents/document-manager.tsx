'use client';
import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, addDoc, serverTimestamp, deleteDoc, doc as firestoreDoc } from 'firebase/firestore';
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
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2, Upload, FileText } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const documentSchema = z.object({
  file: z.instanceof(FileList).refine(files => files?.length === 1, 'File is required.'),
  category: z.string().min(1, 'Category is required.'),
});

export default function DocumentManager() {
  const { user } = useUser();
  const db = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const documentConstraints = useMemo(() => [orderBy('uploadedAt', 'desc')], []);
  const { data: documents, loading } = useCollection<DocumentType>('Documents', {
    constraints: documentConstraints,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof documentSchema>>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      category: '',
      file: undefined,
    },
  });

  async function onSubmit(values: z.infer<typeof documentSchema>) {
    if (!user) {
      toast({ variant: 'destructive', title: 'Error', description: 'You are not authenticated.' });
      return;
    }
    setIsSubmitting(true);
    try {
      const file = values.file[0];
      const storageRef = ref(storage, `documents/${file.name}`);
      const uploadResult = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(uploadResult.ref);

      await addDoc(collection(db, 'Documents'), {
        filename: file.name,
        category: values.category,
        downloadURL: downloadURL,
        uploadedAt: serverTimestamp(),
        uploaderId: user.uid,
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

  const handleDelete = async (docToDelete: DocumentType) => {
    try {
      await deleteDoc(firestoreDoc(db, 'Documents', docToDelete.id));
      const storageRef = ref(storage, `documents/${docToDelete.filename}`);
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
            <CardDescription>Select a PDF and assign a category.</CardDescription>
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
                        <Input placeholder="e.g., Syllabi, Forms, Memos" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
            ) : documents && documents.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Filename</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.filename}</TableCell>
                      <TableCell>{doc.category}</TableCell>
                      <TableCell>{doc.uploadedAt ? format(doc.uploadedAt.toDate(), 'PP') : ''}</TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label={`Delete ${doc.filename}`}>
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
