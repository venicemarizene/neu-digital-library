'use client';
import { useState, useMemo } from 'react';
import { deleteDoc, doc as firestoreDoc, updateDoc } from 'firebase/firestore';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { supabase } from '@/lib/supabaseClient';
import type { Document as DocumentType } from '@/lib/types';
import { orderBy, where } from 'firebase/firestore';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2, FileText, Globe, Users, Search, ArchiveRestore } from 'lucide-react';
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

type SortOption = 'uploadedAt' | 'filename';

export default function ArchiveManager() {
  const { user, loading: userLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [programFilter, setProgramFilter] = useState('ALL');
  const [sortOption, setSortOption] = useState<SortOption>('uploadedAt');

  const programFilterOptions = useMemo(() => [
    { label: "All Programs", value: "ALL" },
    { label: "All CICS (General)", value: "ALL_CICS" },
    ...programs.map(p => ({
        label: p.match(/\(([^)]+)\)/)?.[1] || p,
        value: p
    }))
  ], []);

  const documentConstraints = useMemo(() => [
      where('isArchived', '==', true),
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

  const handleUnarchive = async (docToUnarchive: DocumentType) => {
    if (!db) {
        toast({ variant: 'destructive', title: 'Database not available.' });
        return;
    }
    const docRef = firestoreDoc(db, 'Documents', docToUnarchive.id);
    const updateData = { isArchived: false };
    try {
        await updateDoc(docRef, updateData);
        toast({ title: 'Success', description: `"${docToUnarchive.filename}" has been unarchived.` });
    } catch (error: any) {
        if (error.name === 'FirebaseError' && error.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: docRef.path,
                operation: 'update',
                requestResourceData: updateData,
            });
            errorEmitter.emit('permission-error', permissionError);
        } else {
            console.error("Error unarchiving document:", error);
            toast({ 
                variant: 'destructive', 
                title: 'Unarchive Failed', 
                description: error.message || 'Could not unarchive document.' 
            });
        }
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
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4 w-full">
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
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 w-full">
                    <div className="flex gap-2 flex-wrap">
                        {allDocCategories.map(cat => (
                            <Button key={cat} variant={activeCategory === cat ? 'default' : 'outline'} onClick={() => setActiveCategory(cat)}>
                                {cat}
                            </Button>
                        ))}
                    </div>
                    <div className="w-full sm:w-auto md:w-[240px]">
                      <Select value={sortOption} onValueChange={(value) => setSortOption(value as SortOption)}>
                          <SelectTrigger className="w-full">
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

            {loading ? (
              <div className="flex justify-center items-center h-48">
                  <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : filteredDocuments.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredDocuments.map((doc) => (
                        <Card key={doc.id} className="flex flex-col transition-all hover:shadow-lg rounded-lg bg-muted/30">
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
                            </CardContent>
                            <CardFooter className="mt-auto">
                                <div className="flex w-full items-center gap-2">
                                    <Button variant="outline" className="w-full" onClick={() => handleUnarchive(doc)}>
                                        <ArchiveRestore />
                                        Unarchive
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" className="w-full">
                                                <Trash2 />
                                                Delete Permanently
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action cannot be undone. This will permanently delete the document
                                                "{doc.filename}" from storage and records. This is irreversible.
                                            </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={() => handleDelete(doc)}
                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            >
                                                Delete Permanently
                                            </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/50 p-12 text-center">
                    <ArchiveRestore className="h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">No Archived Documents</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                        When you archive documents, they will appear here.
                    </p>
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
